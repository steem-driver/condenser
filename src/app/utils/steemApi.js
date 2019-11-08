import { api } from '@steemit/steem-js';

import stateCleaner from 'app/redux/stateCleaner';

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
