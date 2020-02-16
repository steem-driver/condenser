import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import Icon from './Icon';

class Likers extends Component {
    render() {
        const { likers, author } = this.props; //redux
        if (likers.get(author) === 'like') {
            return (
                <span title="LikeCoin">
                    <Icon name="like" />
                </span>);
        } else {
            return null;
        }
    }
}

export default connect((state, ownProps) => {
    const { author } = ownProps;
    const likers =
        state.global.getIn(['likers']) == undefined
            ? undefined
            : state.global.getIn(['likers']);
    return {
        likers,
        author,
    };
})(Likers);
