import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { actions as fetchDataSagaActions } from 'app/redux/FetchDataSaga';
import * as transactionActions from 'app/redux/TransactionReducer';

import PostCategoryBanner from './PostCategoryBanner';

class PostCategoryBannerContainer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
        };

        this.props.getCommunity(this.props.communityName);
    }

    render() {
        const { username, community, isCommunity, currentUser } = this.props;

        let label = `${currentUser}'s blog`;
        let labelSmall = '';
        if (isCommunity && community) {
            label = `${community.get('title')}`;
            labelSmall = `#${community.get('name')}`;
        }

        return (
            <PostCategoryBanner
                {...this.state}
                author={currentUser}
                label={label}
                labelSmall={labelSmall}
            />
        );
    }
}

PostCategoryBannerContainer.propTypes = {
    username: PropTypes.string.isRequired,
    communityName: PropTypes.string.isRequired,
    community: PropTypes.object.isRequired, // TODO: define shape
    isCommunity: PropTypes.bool.isRequired,
};

export default connect(
    (state, ownProps) => {
        const currentUser = state.user.getIn(['current', 'username'], null);
        return {
            ...ownProps,
            community: state.global.getIn(
                ['community', ownProps.communityName],
                null
            ),
            currentUser,
        };
    },
    dispatch => ({
        getCommunity: communityName => {
            return dispatch(fetchDataSagaActions.getCommunity(communityName));
        },
    })
)(PostCategoryBannerContainer);
