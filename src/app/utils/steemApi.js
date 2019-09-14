import { api } from '@steemit/steem-js';

import stateCleaner from 'app/redux/stateCleaner';

export async function getStateAsync(url) {
    // strip off query string
    const path = url.split('?')[0];

    var raw = await api.getStateAsync(path);
    if (path === '/recommended')
        raw = await api.getStateAsync('/@cn-curation/feed');
    const cleansed = stateCleaner(raw);

    return cleansed;
}
