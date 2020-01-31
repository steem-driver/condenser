import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import tt from 'counterpart';
import _ from 'lodash';
import Userpic from 'app/components/elements/Userpic';

const highlightText = (text, highlight) => {
    if (!highlight) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
        <span>
            {' '}
            {parts.map((part, i) => (
                <span
                    key={i}
                    style={
                        part.toLowerCase() === highlight.toLowerCase()
                            ? { fontWeight: 'bold' }
                            : {}
                    }
                >
                    {part}
                </span>
            ))}{' '}
        </span>
    );
};

const pic = author => {
    return (
        <a href={'/@' + author}>
            <Userpic account={author} />
        </a>
    );
};

export default class NotificationsList extends React.Component {
    render() {
        const renderItem = item => {
            if (item.type === 'mention') {
                return (
                    <div
                        key={item.timestamp}
                        className="notification__item flex-body"
                    >
                        <div className="flex-row">{pic(`${item.author}`)}</div>
                        <div className="flex-column">
                            <div className="notification__message">
                                <a href={`/@${item.author}/${item.permlink}`}>
                                    {highlightText(
                                        `${
                                            item.author
                                        } mentioned you in a post`,
                                        `${item.author}`
                                    )}
                                </a>
                            </div>
                        </div>
                    </div>
                );
            } else if (item.type === 'transfer') {
                return (
                    <div
                        key={item.timestamp}
                        className="notification__item flex-body"
                    >
                        <div className="flex-row">{pic(`${item.from}`)}</div>
                        <div className="flex-column">
                            <div className="notification__message">
                                <a href={`/transfer`}>
                                    {highlightText(
                                        `${item.from} transferred ${
                                            item.amount
                                        } to you`,
                                        `${item.from}`
                                    )}
                                </a>
                            </div>
                        </div>
                    </div>
                );
            } else if (item.type === 'reply') {
                return (
                    <div
                        key={item.timestamp}
                        className="notification__item flex-body"
                    >
                        <div className="flex-row">{pic(`${item.author}`)}</div>
                        <div className="flex-column">
                            <div className="notification__message">
                                <a href={`/transfer`}>
                                    {highlightText(
                                        `${item.author} commented on your post`,
                                        `${item.author}`
                                    )}
                                </a>
                            </div>
                        </div>
                    </div>
                );
            } else if (item.type === 'reblog') {
                return (
                    <div
                        key={item.timestamp}
                        className="notification__item flex-body"
                    >
                        <div className="flex-row">{pic(`${item.account}`)}</div>
                        <div className="flex-column">
                            <div className="notification__message">
                                <a href={`/transfer`}>
                                    {highlightText(
                                        `${item.account} reblogged your post`,
                                        `${item.account}`
                                    )}
                                </a>
                            </div>
                        </div>
                    </div>
                );
            } else if (item.type === 'follow') {
                return (
                    <div
                        key={item.timestamp}
                        className="notification__item flex-body"
                    >
                        <div className="flex-row">
                            {pic(`${item.follower}`)}
                        </div>
                        <div className="flex-column">
                            <div className="notification__message">
                                <a href={`/@${item.follower}`}>
                                    {highlightText(
                                        `${
                                            item.follower
                                        } started following you`,
                                        `${item.follower}`
                                    )}
                                </a>
                            </div>
                        </div>
                    </div>
                );
            } else if (item.type === 'vote') {
                return (
                    <div
                        key={item.timestamp}
                        className="notification__item flex-body"
                    >
                        <div className="flex-row">{pic(`${item.voter}`)}</div>
                        <div className="flex-column">
                            <div className="notification__message">
                                <a href={`/@${item.voter}`}>
                                    {highlightText(
                                        `${item.voter} downvoted your post`,
                                        `${item.voter}`
                                    )}
                                </a>
                            </div>
                        </div>
                    </div>
                );
            }
        };
        const { notifications } = this.props;
        return (
            <div style={{ lineHeight: '1rem' }}>
                {notifications.map(item => renderItem(item.toJS()))}
            </div>
        );
    }
}
