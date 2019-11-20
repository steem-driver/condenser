import { List } from 'immutable';

// sometimes it's impossible to use html tags to style coin name, hence usage of _UPPERCASE modifier
export const APP_NAME = 'SteemCN';
// sometimes APP_NAME is written in non-latin characters, but they are needed for technical purposes
// ie. "Голос" > "Golos"
export const APP_NAME_LATIN = 'SteemCN';
export const APP_NAME_UPPERCASE = 'STEEMCN';
export const APP_ICON = 'steemcn';
export const APP_MAX_TAG = 25;
// FIXME figure out best way to do this on both client and server from env
// vars. client should read $STM_Config, server should read config package.
export const APP_URL = 'https://www.steemcn.org';
export const APP_DOMAIN = 'steemcn.org';
export const CURATION_ACCOUNT = 'cn-curators';
export const TAG_LIST = List([
    'cn',
    'cn-activity',
    'cn-book',
    'cn-curation',
    'cn-hello',
    'cn-reader',
    'cn-voice',
    'cnweekends',
    'steem-guides',
    'teamcn-homework',
]);
export const DEFAULT_TAGS = [
    'palnet',
    'zzan',
    'dblog',
    'mediaofficials',
    'marlians',
    'neoxian',
    'lassecash',
    'upfundme',
];
export const LANGUAGE_TAGS = List(['cn:中文']);
export const SCOT_TAGS = List([
    'lifestyle:生活',
    'photography:摄影',
    'build-it:DIY',
    'naturalproducts:养生',
    'steemleo:投资',
    'creativecoin:艺术',
    'steemace battle iv:游戏',
    'spt battle steemace iv:Steemmonsters',
    'aaa:影评',
    'sportstalk:体育',
    'realityhubs:产品评价',
]);

export const NORMAL_TAGS = List([
    'cn-reader cn-curation whalepower:中文好文',
    'ocd-resteem:英文好文',
    'cn-voice creativecoin sonicgroove tunes:好声音',
    'steem-guides sct-userguide:STEEM指南',
    'cn-hello introduceyourself:自我介绍',
    'cn-activity:发起活动',
    'teamcn-homework:新手作业',
    'cn-stem steemstem:科学技术',
    'cn-stem steemstem cn-programming:编程',
]);

export const LIQUID_TOKEN = 'Steem';
// sometimes it's impossible to use html tags to style coin name, hence usage of _UPPERCASE modifier
export const LIQUID_TOKEN_UPPERCASE = 'STEEM';
export const VESTING_TOKEN = 'STEEM POWER';
export const INVEST_TOKEN_UPPERCASE = 'STEEM POWER';
export const INVEST_TOKEN_SHORT = 'SP';
export const DEBT_TOKEN = 'STEEM DOLLAR';
export const DEBT_TOKENS = 'STEEM DOLLARS';
export const CURRENCY_SIGN = '$';
export const WIKI_URL = ''; // https://wiki.golos.io/
export const LANDING_PAGE_URL = 'https://steem.io/';
export const TERMS_OF_SERVICE_URL = 'https://' + APP_DOMAIN + '/tos.html';
export const PRIVACY_POLICY_URL = 'https://' + APP_DOMAIN + '/privacy.html';
export const WHITEPAPER_URL = 'https://steem.io/SteemWhitePaper.pdf';

// these are dealing with asset types, not displaying to client, rather sending data over websocket
export const LIQUID_TICKER = 'STEEM';
export const VEST_TICKER = 'VESTS';
export const DEBT_TICKER = 'SBD';
export const DEBT_TOKEN_SHORT = 'SBD';

// application settings
export const DEFAULT_LANGUAGE = 'en'; // used on application internationalization bootstrap
export const DEFAULT_CURRENCY = 'USD';
export const ALLOWED_CURRENCIES = ['USD'];
export const FRACTION_DIGITS = 2; // default amount of decimal digits
export const FRACTION_DIGITS_MARKET = 3; // accurate amount of deciaml digits (example: used in market)

// meta info
export const TWITTER_HANDLE = '@steemit';
export const SHARE_IMAGE =
    'https://' + APP_DOMAIN + '/images/steemit-share.png';
export const TWITTER_SHARE_IMAGE =
    'https://' + APP_DOMAIN + '/images/steemit-twshare.png';
export const SITE_DESCRIPTION =
    'SteemCN is a social media platform where everyone gets paid for ' +
    'creating and curating content. It leverages a robust digital points system, called Steem, that ' +
    'supports real value for digital rewards through market price discovery and liquidity';

// various
export const SUPPORT_EMAIL = 'support@' + APP_DOMAIN;
