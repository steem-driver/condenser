import React from 'react';
import PropTypes from 'prop-types';

const SteemLogo = () => {
    return (
        <span className="logo">
            <title>steemCN logo</title>
            <img src={require('app/assets/images/steemcn.png')} />
        </span>
    );
};

export default SteemLogo;
