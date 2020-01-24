import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import o2j from 'shared/clash/object2json';

class LikeButton extends Component {
    render() {
        const { profile, post } = this.props;//redux
        if (profile.location == undefined) {
            return (
                <div></div>
            )
        } else {
            const liker_id = profile.location.split(":")[0] == 'likerid' ? profile.location.split(":")[1] : '';
            if (liker_id != '') {
                let src = `https://button.like.co/in/embed/${liker_id}/button?referrer=https://steem.buzz/${post.url}`;
                return (

                    <div>
                        <iframe
                            src={src}
                            frameBorder="0"
                            allowFullScreen="true"
                            scrolling="no"
                            align="middle"
                        />
                    </div>

                );
            } else {
                return (
                    <div></div>
                )
            }
        }
    }

}



export default connect((state, ownProps) => {
    const { post } = ownProps;
    const account = state.global.getIn(['accounts', post.author]) == undefined ? undefined : state.global.getIn(['accounts', post.author]).toJS();
    let metaData = account
        ? o2j.ifStringParseJSON(account.json_metadata)
        : {};
    const profile = metaData && metaData.profile ? metaData.profile : {};
    return {
        profile,
        post,
    };
})(LikeButton);