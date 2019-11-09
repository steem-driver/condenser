import { api } from '@steemit/steem-js';

import stateCleaner from 'app/redux/stateCleaner';
import axios from 'axios';
import SSC from 'sscjs';

const ssc = new SSC('https://api.steem-engine.com/rpc');

export async function getStateAsync(url) {
    // strip off query string
    const path = url.split('?')[0];

    const raw = await api.getStateAsync(path);

    if (!raw.accounts) {
        raw.accounts = {};
    }
    const urlParts = url.match(/^[\/]?@([^\/]+)\/transfers[\/]?$/);
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
        const [tokenBalances] = await Promise.all([
            // modified to get all tokens. - by anpigon
            ssc.find('tokens', 'balances', {
                account,
            }),
        ]);
        if (tokenBalances) {
            raw.accounts[account].token_balances = tokenBalances;
        }
    }
    const cleansed = stateCleaner(raw);

    return cleansed;
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
