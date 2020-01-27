import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import tt from 'counterpart';
import _ from 'lodash';
import NotificationReply from './NotificationReply';

class NotificationsList extends React.Component {

    render() {
        const { notifications } = this.props;
       
            let content;
            notifications.map(notification => {
                let notificationJs = notification.toJS();
                content +=` <span>${notificationJs.type}</span>`
            
            })
            return(
            <div>{content}</div>
            );
    }
}

export default connect((state, ownProps) => {
    const { notifications } = ownProps;

    return {
        notifications,
    };
})(NotificationsList);
