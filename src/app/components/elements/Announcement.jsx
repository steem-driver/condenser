import PropTypes from 'prop-types';
import React from 'react';

export const Announcement = ({ onClose }) => (
    <div className="annoucement-banner">
        <p className="announcement-banner__text">
        <a className="announcement-banner__link" href="https://steemcn.xyz">
        steem.buzz域名将于10月19日过期，过期后将不继续续约。新域名为https://steemcn.xyz
            </a>
        </p>
        <button className="close-button" type="button" onClick={onClose}>
            &times;
        </button>
    </div>
);

Announcement.propTypes = {
    onClose: PropTypes.func.isRequired,
};

export default Announcement;
