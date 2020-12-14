import { api } from '@steemit/steem-js';
import stateCleaner from 'app/redux/stateCleaner';
import axios from 'axios';
import SSC from 'sscjs';
import { CURATION_ACCOUNT, LIKER_ACCOUNT } from 'app/client_config';

const ssc = new SSC('https://api.steem-engine.com/rpc');

export async function callBridge(method, params) {
    console.log(
        'call bridge',
        method,
        params && JSON.stringify(params).substring(0, 200)
    );

    return new Promise(function(resolve, reject) {
        api.call('bridge.' + method, params, function(err, data) {
            if (err) reject(err);
            else resolve(data);
        });
    });
}
export async function getStateAsync(url) {
    // strip off query string
    const path = url.split('?')[0];
    let raw;

    if (path === '/recommended/' || path === '/recommended') {
        raw = await api.getStateAsync('/@' + CURATION_ACCOUNT + '/feed');
    } else if (path === '/likers/' || path === '/likers') {
        raw = await api.getStateAsync('/@' + LIKER_ACCOUNT + '/feed');
    } else {
        raw = await api.getStateAsync(path);
    }
    if (!raw.accounts) {
        raw.accounts = {};
    }
    const urlParts = url.match(/^[\/]?@([^\/]+)\/transfers[\/]?$/);
    let username;
    if (path.includes('@')) {
        let parts = path.split('/');
        if (parts.length === 4) {
            username = parts[2].replace('@', '');
        } else {
            username = url.match(/^[\/]?@([^\/]+)/)[1];
        }
        if (username) {
            let account = await getAccount(username);
            raw.accounts[username].json_metadata =
                account.json_metadata === '{}'
                    ? account.posting_json_metadata
                    : account.json_metadata;
        }
    }
    if (!raw.likers) {
        raw.likers = {};
    }
    raw.likers = await getFollowing(LIKER_ACCOUNT);
    if (urlParts) {
        const account = urlParts[1];
        if (!raw.accounts[account]) {
            raw.accounts[account] = await getAccount(account);
        }
        if (!raw.props) {
            raw.props = await getGlobalProps();
        }
        if (!raw.content) {
            raw.content = {};
        }
        if (!raw.accounts[account].transfer_history.length) {
            raw.accounts[account].transfer_history = await getAccountHistory(
                account
            );
        }
        raw.accounts[account].trxAddress = '';
        raw.accounts[account].trxBalance = 0;
        raw.accounts[account].trxPendingReward = '0 TRX';
        await axios
            .get(
                'https://cors-anywhere.herokuapp.com/https://steemitwallet.com/api/v1/tron/tron_user?username=' +
                    account,
                { timeout: 3000 }
            )
            .then(response => {
                if (response.status === 200) {
                    raw.accounts[account].trxAddress =
                        response.data.result.tron_addr;
                    raw.accounts[account].trxPendingReward =
                        response.data.result.pending_claim_tron_reward;
                }
            })
            .catch(error => {
                console.error(error);
            });
        if (raw.accounts[account].trxAddress !== '') {
            await axios
                .get(
                    'https://api.trongrid.io/v1/accounts/' +
                        raw.accounts[account].trxAddress,
                    { timeout: 3000 }
                )
                .then(response => {
                    if (response.status === 200) {
                        raw.accounts[account].trxBalance = (
                            response.data.data[0].balance / 1000000
                        ).toFixed(3);
                    }
                })
                .catch(error => {
                    console.error(error);
                });
        }

        // const [tokenBalances, tokenStatuses] = await Promise.all([
        //     // modified to get all tokens. - by anpigon
        //     ssc.find('tokens', 'balances', {
        //         account,
        //     }),
        //     getScotAccountDataAsync(account),
        // ]);
        // if (tokenBalances) {
        //     raw.accounts[account].token_balances = tokenBalances;
        // }
        // if (tokenStatuses) {
        //     raw.accounts[account].all_token_status = tokenStatuses;
        // }
    }
    const cleansed = stateCleaner(raw);

    return cleansed;
}

async function getFollowing(
    account,
    startFollowing = '',
    limit = 500,
    followings = {}
) {
    return new Promise((resolve, reject) => {
        api.getFollowing(account, startFollowing, 'blog', limit, function(
            err,
            result
        ) {
            if (result.length > 1) {
                for (let res of result) {
                    followings[res.following] = 'like';
                }
                //getFollowing(account,result[result.length-1],limit,followings).then(resolve).catch(reject);
            }
            resolve(followings);
        });
    });
}
function getTrxAddress() {
    return new Promise((resolve, reject) => {});
}

export async function getScotDataAsync(path, params) {
    return callApi(`https://scot-api.steem-engine.com/${path}`, params);
}

export async function getScotAccountDataAsync(account) {
    return getScotDataAsync(`@${account}`, { v: new Date().getTime() });
}

async function getAccount(account) {
    const accounts = await api.getAccountsAsync([account]);
    return accounts && accounts.length > 0 ? accounts[0] : {};
}
async function getGlobalProps() {
    const gprops = await api.getDynamicGlobalPropertiesAsync();
    return gprops;
}
async function getAccountHistory(account) {
    const history = await api.getAccountHistoryAsync(account, -1, 1000);
    let transfers = history.filter(tx => tx[1].op[0] === 'transfer');
    return transfers && transfers.length > 0 ? transfers : {};
}

async function getTrxBalance(account) {
    let address = callApi(
        `https://cors-anywhere.herokuapp.com/https://steemitwallet.com/api/v1/tron/tron_user?username=${
            account
        }`
    );
    let result = callApi(`https://api.trongrid.io/v1/accounts/${address}`);
    console.log(result);
}

async function callApi(url, params) {
    return await axios({
        url,
        method: 'GET',
        params,
    })
        .then(response => {
            return response.data;
        })
        .catch(err => {
            console.error(`Could not fetch data, url: ${url}`);
            return {};
        });
}
