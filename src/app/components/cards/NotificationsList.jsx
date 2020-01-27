import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import tt from 'counterpart';

class NotificationsList extends React.Component {
    static propTypes = {
        notifications: PropTypes.object.isRequired,
    };


    constructor() {
        super();
        this.shouldComponentUpdate = shouldComponentUpdate(
            this,
            'NotificationsList'
        );
    }

    render() {
        const { notifications } = this.props;
        console.log('notifications')
        console.log(notifications)
    }
}

export default connect((state, props) => {
    return {
        ...props,
    };
})(NotificationsList);