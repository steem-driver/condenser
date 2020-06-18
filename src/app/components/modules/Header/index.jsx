import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router';
import { connect } from 'react-redux';
import { immutableAccessor } from 'app/utils/Accessors';
import extractContent from 'app/utils/ExtractContent';
import Headroom from 'react-headroom';
import Icon from 'app/components/elements/Icon';
import resolveRoute from 'app/ResolveRoute';
import tt from 'counterpart';
import { APP_NAME } from 'app/client_config';
import { APP_ICON } from 'app/client_config';
import SortOrder from 'app/components/elements/SortOrder';
import { actions as fetchDataSagaActions } from 'app/redux/FetchDataSaga';
import SearchInput from 'app/components/elements/SearchInput';
import IconButton from 'app/components/elements/IconButton';
import DropdownMenu from 'app/components/elements/DropdownMenu';
import * as userActions from 'app/redux/UserReducer';
import * as appActions from 'app/redux/AppReducer';
import Userpic from 'app/components/elements/Userpic';
import { SIGNUP_URL } from 'shared/constants';
import SteemLogo from 'app/components/elements/SteemLogo';
import { startPolling } from 'app/redux/PollingSaga';
import normalizeProfile from 'app/utils/NormalizeProfile';
import Announcement from 'app/components/elements/Announcement';
import GptAd from 'app/components/elements/GptAd';
import { GptUtils } from 'app/utils/GptUtils';
import SvgImage from 'app/components/elements/SvgImage';
class Header extends React.Component {
    static propTypes = {
        current_account_name: PropTypes.string,
        account_meta: PropTypes.object,
        category: PropTypes.string,
        order: PropTypes.string,
        pathname: PropTypes.string,
        getUnreadAccountNotifications: PropTypes.func,
        startNotificationsPolling: PropTypes.func,
        loggedIn: PropTypes.bool,
        unreadNotificationCount: PropTypes.number,
    };

    constructor(props) {
        super(props);

        this.state = {
            gptAdRendered: false,
            showAd: false,
            showAnnouncement: this.props.showAnnouncement,
        };
    }

    componentWillMount() {
        const {
            loggedIn,
            current_account_name,
            startNotificationsPolling,
        } = this.props;
        if (loggedIn) {
            startNotificationsPolling(current_account_name);
        }
    }

    componentDidMount() {
        if (
            !this.props.gptEnabled ||
            !process.env.BROWSER ||
            !window.googletag ||
            !window.googletag.pubads
        ) {
            return null;
        }

        window.addEventListener('gptadshown', e => this.gptAdRendered(e));
    }

    componentWillUnmount() {
        if (
            !this.props.gptEnabled ||
            !process.env.BROWSER ||
            !window.googletag ||
            !window.googletag.pubads
        ) {
            return null;
        }
    }

    // Consider refactor.
    // I think 'last sort order' is something available through react-router-redux history.
    // Therefore no need to store it in the window global like this.
    componentWillReceiveProps(nextProps) {
        if (nextProps.pathname !== this.props.pathname) {
            const route = resolveRoute(nextProps.pathname);
            if (
                route &&
                route.page === 'PostsIndex' &&
                route.params &&
                route.params.length > 0
            ) {
                const sort_order =
                    route.params[0] !== 'home' ? route.params[0] : null;
                if (sort_order)
                    window.last_sort_order = this.last_sort_order = sort_order;
            }
        }
    }

    headroomOnUnpin() {
        this.setState({ showAd: false });
    }

    headroomOnUnfix() {
        this.setState({ showAd: true });
    }

    gptAdRendered() {
        this.setState({ showAd: true, gptAdRendered: true });
    }

    hideAnnouncement() {
        this.setState({ showAnnouncement: false });
        this.props.hideAnnouncement();
    }

    render() {
        const {
            category,
            order,
            pathname,
            current_account_name,
            username,
            showLogin,
            logout,
            loggedIn,
            vertical,
            nightmodeEnabled,
            toggleNightmode,
            userPath,
            showSidePanel,
            navigate,
            account_meta,
            walletUrl,
            content,
            gptBannedTags,
            unreadNotificationCount,
            notificationActionPending,
        } = this.props;

        const { showAd, showAnnouncement } = this.state;
        /*Set the document.title on each header render.*/
        const route = resolveRoute(pathname);
        let allowAdsOnContent = true;
        let home_account = false;
        let page_title = route.page;
        let sort_order = '';
        let topic = '';
        let page_name = null;
        if (route.page === 'PostsIndex') {
            sort_order = route.params[0];
            if (sort_order === 'home') {
                page_title = tt('header_jsx.home');
                const account_name = route.params[1];
                if (
                    current_account_name &&
                    account_name.indexOf(current_account_name) === 1
                )
                    home_account = true;
            } else {
                topic = route.params.length > 1 ? route.params[1] : '';
                allowAdsOnContent =
                    this.props.gptEnabled &&
                    !GptUtils.HasBannedTags([topic], gptBannedTags);
                const type =
                    route.params[0] == 'payout_comments' ? 'comments' : 'posts';
                let prefix = route.params[0];
                if (prefix == 'created') prefix = 'New';
                if (prefix == 'payout') prefix = 'Pending payout';
                if (prefix == 'payout_comments') prefix = 'Pending payout';
                if (topic !== '') prefix += ` ${topic}`;
                page_title = `${prefix} ${type}`;
            }
        } else if (route.page === 'Post') {
            const user = `${route.params[1]}`.replace('@', '');
            const slug = `${route.params[2]}`;
            if (content) {
                const post_content = content.get(`${user}/${slug}`);
                if (post_content) {
                    const p = extractContent(immutableAccessor, post_content);
                    const tags = p.json_metadata.tags || [];
                    allowAdsOnContent =
                        this.props.gptEnabled &&
                        !GptUtils.HasBannedTags(tags, gptBannedTags);
                }
            }
            sort_order = '';
            topic = route.params[0];
        } else if (route.page == 'SubmitPost') {
            page_title = tt('header_jsx.create_a_post');
        } else if (route.page == 'Privacy') {
            page_title = tt('navigation.privacy_policy');
        } else if (route.page == 'Tos') {
            page_title = tt('navigation.terms_of_service');
        } else if (route.page == 'RecoverAccountStep1') {
            page_title = tt('header_jsx.stolen_account_recovery');
        } else if (route.page === 'UserProfile') {
            const user_name = route.params[0].slice(1);
            const name = account_meta
                ? normalizeProfile(account_meta.toJS()).name
                : null;
            const user_title = name ? `${name} (@${user_name})` : user_name;
            page_title = user_title;
            if (route.params[1] === 'followers') {
                page_title = tt('header_jsx.people_following', {
                    username: user_title,
                });
            }
            if (route.params[1] === 'followed') {
                page_title = tt('header_jsx.people_followed_by', {
                    username: user_title,
                });
            }
            if (route.params[1] === 'curation-rewards') {
                page_title = tt('header_jsx.curation_rewards_by', {
                    username: user_title,
                });
            }
            if (route.params[1] === 'author-rewards') {
                page_title = tt('header_jsx.author_rewards_by', {
                    username: user_title,
                });
            }
            if (route.params[1] === 'recent-replies') {
                page_title = tt('header_jsx.replies_to', {
                    username: user_title,
                });
            }
            if (route.params[1] === 'notifications') {
                page_title = tt('header_jsx.notifications', {
                    username: user_title,
                });
            }
            // @user/"posts" is deprecated in favor of "comments" as of oct-2016 (#443)
            if (route.params[1] === 'posts' || route.params[1] === 'comments') {
                page_title = tt('header_jsx.comments_by', {
                    username: user_title,
                });
            }
        } else {
            page_name = ''; //page_title = route.page.replace( /([a-z])([A-Z])/g, '$1 $2' ).toLowerCase();
        }

        // Format first letter of all titles and lowercase user name
        if (route.page !== 'UserProfile') {
            page_title =
                page_title.charAt(0).toUpperCase() + page_title.slice(1);
        }

        if (
            process.env.BROWSER &&
            (route.page !== 'Post' && route.page !== 'PostNoCategory')
        )
            document.title = page_title + ' — ' + APP_NAME;

        const logo_link =
            resolveRoute(pathname).params &&
                resolveRoute(pathname).params.length > 1 &&
                this.last_sort_order
                ? '/' + this.last_sort_order
                : current_account_name ? `/@${current_account_name}/feed` : '/';

        //TopRightHeader Stuff
        const defaultNavigate = e => {
            if (e.metaKey || e.ctrlKey) {
                // prevent breaking anchor tags
            } else {
                e.preventDefault();
            }
            const a =
                e.target.nodeName.toLowerCase() === 'a'
                    ? e.target
                    : e.target.parentNode;
            browserHistory.push(a.pathname + a.search + a.hash);
        };

        // Since navigate isn't set, defaultNavigate will always be used.
        const nav = navigate || defaultNavigate;

        const submit_story = $STM_Config.read_only_mode ? null : (
            <Link to="/submit.html">
                <IconButton />
            </Link>
        );

        const feed_link = `/@${username}/feed`;
        const replies_link = `/@${username}/recent-replies`;
        const account_link = `/@${username}`;
        const comments_link = `/@${username}/comments`;
        const wallet_link = `/@${username}/transfers`;
        const settings_link = `/@${username}/settings`;
        const notifications_link = `/@${username}/notifications`;
        const pathCheck = userPath === '/submit.html' ? true : null;
        const notif_label =
            tt('g.notifications') +
            (unreadNotificationCount > 0
                ? ` (${unreadNotificationCount})`
                : '');
        const user_menu = [
            {
                link: feed_link,
                icon: 'home',
                value: tt('g.feed'),
            },
            { link: account_link, icon: 'profile', value: tt('g.blog') },
            {
                link: notifications_link,
                icon: 'notification',
                value: notif_label,
            },
            { link: comments_link, icon: 'replies', value: tt('g.comments') },
            {
                link: replies_link,
                icon: 'reply',
                value: tt('g.replies'),
            },
            {
                link: wallet_link,
                icon: 'wallet',
                value: tt('g.wallet'),
            },

            {
                link: '#',
                icon: 'eye',
                onClick: toggleNightmode,
                value: tt('g.toggle_nightmode'),
            },
            { link: settings_link, icon: 'cog', value: tt('g.settings') },
            loggedIn
                ? {
                    link: '#',
                    icon: 'enter',
                    onClick: logout,
                    value: tt('g.logout'),
                }
                : { link: '#', onClick: showLogin, value: tt('g.login') },
        ];
        return (
            <Headroom
                onUnpin={e => this.headroomOnUnpin(e)}
                onUnfix={e => this.headroomOnUnfix(e)}
            >
                <header className="Header">
                    {
                        this.props.showAnnouncement && shouldShowAnnouncement() && (
                            <Announcement onClose={this.props.hideAnnouncement} />
                        )}

                    {/* If announcement is shown, ad will not render unless it's in a parent div! */}


                    <div
                        style={
                            showAd && allowAdsOnContent
                                ? {}
                                : { display: 'none' }
                        }
                    >
                        {allowAdsOnContent && (
                            <GptAd
                                type="Freestar"
                                id="steemit_728x90_970x90_970x250_320x50_ATF"
                            />
                        )}
                    </div>

                    <nav className="row Header__nav">
                        <div className="small-5 large-4 columns Header__logotype">
                            {/*LOGO*/}
                            <Link to={logo_link}>
                                <SvgImage
                                    name={APP_ICON}
                                    width="150px"
                                    height="40px"
                                />
                            </Link>
                        </div>

                        <div className="large-4 columns show-for-large large-centered Header__sort">
                            {/*SORT*/}
                            <SortOrder
                                sortOrder={order}
                                topic={category === 'feed' ? '' : category}
                                horizontal
                                pathname={pathname}
                            />
                        </div>
                        <div className="small-7 large-4 columns Header__buttons">
                            {/*NOT LOGGED IN SIGN IN AND SIGN UP LINKS*/}
                            {!loggedIn && (
                                <span className="Header__user-signup">
                                    <a
                                        className="Header__login-link"
                                        href="/login.html"
                                        onClick={showLogin}
                                    >
                                        {tt('g.login')}
                                    </a>
                                    <a
                                        className="Header__signup-link"
                                        href={SIGNUP_URL}
                                    >
                                        {tt('g.sign_up')}
                                    </a>
                                </span>
                            )}

                            {/*CUSTOM SEARCH*/}
                            {loggedIn && (

                                <span className="Header__search--desktop">
                                    <SearchInput />
                                </span>
                            )}

                            {loggedIn && (
                                <span className="Header__search">
                                    <a href="/static/search.html">
                                        <IconButton icon="magnifyingGlass" />
                                    </a>
                                </span>
                            )}



                            {/*SUBMIT STORY*/}
                            {loggedIn && (
                                <Link to="/submit.html">
                                    <IconButton />
                                </Link>
                            )
                            }
                            {/*USER AVATAR */}
                            {loggedIn && (
                                <DropdownMenu
                                    className={'Header__usermenu'}
                                    items={user_menu}
                                    title={username}
                                    el="span"
                                    selected={tt('g.rewards')}
                                    position="left"
                                >
                                    <li className={'Header__userpic '}>
                                            <Userpic account={username} />
                                        </li>
                                    {!notificationActionPending &&
                                        unreadNotificationCount > 0 && (
                                            <div
                                                className={
                                                    'Header__notification'
                                                }
                                            >
                                                <span>
                                                    {unreadNotificationCount}
                                                </span>
                                            </div>
                                        )}
                                </DropdownMenu>
                            )}
                        </div>
                    </nav>
                </header>
            </Headroom>
        );
    }
}

export { Header as _Header_ };

const mapStateToProps = (state, ownProps) => {
    // SSR code split.
    if (!process.env.BROWSER) {
        return {
            username: null,
            loggedIn: false,
        };
    }

    let user_profile;
    const route = resolveRoute(ownProps.pathname);
    if (route.page === 'UserProfile') {
        user_profile = state.global.getIn([
            'accounts',
            route.params[0].slice(1),
        ]);
    }

    const userPath = state.routing.locationBeforeTransitions.pathname;
    const username = state.user.getIn(['current', 'username']);    
    const loggedIn = !!username;
    const current_account_name = username
        ? username
        : state.offchain.get('account');

    const gptEnabled = state.app.getIn(['googleAds', 'gptEnabled']);
    const gptBannedTags = state.app.getIn(['googleAds', 'gptBannedTags']);
    const walletUrl = state.app.get('walletUrl');
    const content = state.global.get('content');
    let unreadNotificationCount = 0;
    if (
        loggedIn &&
        state.global.getIn([
            'notifications',
            current_account_name,
            'unreadNotifications',
        ])
    ) {
        unreadNotificationCount = state.global.getIn([
            'notifications',
            current_account_name,
            'unreadNotifications',
            'unread',
        ]);
    }
    return {
        username,
        loggedIn,
        userPath,
        nightmodeEnabled: state.user.getIn(['user_preferences', 'nightmode']),
        account_meta: user_profile,
        current_account_name,
        showAnnouncement: state.user.get('showAnnouncement'),
        gptEnabled,
        gptBannedTags,
        walletUrl,
        content,
        unreadNotificationCount,
        notificationActionPending: state.global.getIn([
            'notifications',
            'loading',
        ]),
        ...ownProps,
    };
};

const mapDispatchToProps = dispatch => ({
    showLogin: e => {
        if (e) e.preventDefault();
        dispatch(userActions.showLogin({ type: 'basic' }));
    },
    logout: e => {
        if (e) e.preventDefault();
        dispatch(userActions.logout({ type: 'default' }));
    },
    toggleNightmode: e => {
        if (e) e.preventDefault();
        dispatch(appActions.toggleNightmode());
    },
    showSidePanel: () => {
        dispatch(userActions.showSidePanel());
    },
    hideSidePanel: () => {
        dispatch(userActions.hideSidePanel());
    },
    hideAnnouncement: () => dispatch(userActions.hideAnnouncement()),

    getUnreadAccountNotifications: username => {
        const query = {
            account: username,
        };
        return dispatch(
            fetchDataSagaActions.getUnreadAccountNotifications(query)
        );
    },
    startNotificationsPolling: username => {
        const query = {
            account: username,
        };
        const params = {
            pollAction: fetchDataSagaActions.getUnreadAccountNotifications,
            pollPayload: query,
            delay: 600000, // The delay between successive polls
        };
        return dispatch(startPolling(params));
    },
});

const connectedHeader = connect(mapStateToProps, mapDispatchToProps)(Header);


function shouldShowAnnouncement() {
    if (
        typeof localStorage === 'undefined' ||
        (typeof localStorage !== 'undefined' &&
            localStorage.getItem('hideAnnouncement') !== 'true')
    )
        return true;
    else return false;
}

export default connectedHeader;


