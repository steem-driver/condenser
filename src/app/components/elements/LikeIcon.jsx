import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import o2j from 'shared/clash/object2json';
import Icon from './Icon';

class LikeIcon extends Component {
    render() {
        const { profile } = this.props; //redux
        if (profile.location == undefined) {
            return <div />;
        } else {
            const liker_id =
                profile.location.split(':')[0] == 'likerid'
                    ? profile.location.split(':')[1]
                    : '';
            if (liker_id != '') {
                return (
                    <span title="LikeCoin">
                        <Icon name="like" />
                    </span>
                );
            } else {
                return <span />;
            }
        }
    }
}

export default connect((state, ownProps) => {
    const { author } = ownProps;
    const account =
        state.global.getIn(['accounts', author]) == undefined
            ? undefined
            : state.global.getIn(['accounts', author]).toJS();
    let metaData = account ? o2j.ifStringParseJSON(account.json_metadata) : {};
    const profile = metaData && metaData.profile ? metaData.profile : {};
    return {
        profile,
    };
})(LikeIcon);
