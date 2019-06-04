import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';

class GptAd extends Component {
    componentDidMount() {
        const ad_identifier = this.ad_identifier;
        // if (!this.ad.path || !this.enabled) return;

        // googletag.cmd.push(() => {
        //     const slot = googletag.defineSlot(
        //         this.ad.path,
        //         this.ad.dimensions,
        //         this.ad.path
        //     );
        // Tag IDs set here, must match Tags served in the Body for proper setup
        console.log(
            'GptAd->freestar.config.enabled_slots',
            freestar.config.enabled_slots
        );
        freestar.newAdSlots([
            {
                placementName: ad_identifier, // This has to match up with the backend and frontend and all the other ends.
                slotId: ad_identifier, //TODO: This has to be unique.
            },
        ]);
        // freestar.config.enabled_slots = [
        //     ad_identifier,
        // "steemit_728x90_970x90_970x250_320x50_ATF",
        // "steemit_160x600_Left_1",
        // "steemit_160x600_Left_2",
        // "steemit_160x600_Right",
        // "steemit_728x90_468x60_300x250_InFeed",
        // "steemit_728x90_468x60_300x250_AboveComments",
        // "steemit_728x90_468x60_300x250_BetweenComments",
        // "steemit_728x90_468x60_300x250_BelowComments"
        // ];

        // if (slot) {
        // freestar.queue.push(() => {
        //     googletag.display(ad_identifier);
        // });
        // slot.addService(googletag.pubads());
        // googletag.pubads().enableSingleRequest();
        // googletag.enableServices();
        //
        // googletag.cmd.push(() => {
        //     googletag.display(this.ad.path);
        //     googletag.pubads().refresh([slot]);
        //     googletag
        //         .pubads()
        //         .addEventListener('slotRenderEnded', e => {
        //             window.dispatchEvent(new Event('gptadshown', e));
        //         });
        // });
        //     }
        // });
    }

    constructor(props) {
        super(props);
        const { ad_identifier, enabled, type } = props;
        console.log('GptAd->constructor()', props);

        this.ad_identifier = '';
        this.type = type;
        this.enabled = false;

        if (ad_identifier != '') {
            console.info(
                `ad_identifier of '${ad_identifier}' will render.`,
                ad_identifier
            );
            this.enabled = enabled;
            this.ad_identifier = ad_identifier;
        } else {
            console.info(
                `Slot named '${
                    props.slotName
                }' will be disabled because we were unable to find the ad details.`
            );
        }
    }

    render() {
        // if (!this.ad_identifier || !this.enabled) {
        //     return <div id="disabled_ad" style={{ display: 'none' }} />;
        // }

        return (
            <div
                className="gpt-ad"
                style={{ width: '100%' }}
                id={this.ad_identifier}
            />
        );
    }
}

GptAd.propTypes = {
    // ad: PropTypes.shape({
    //     path: PropTypes.string,
    //     dimensions: PropTypes.array,
    // }).isRequired,
    ad_identifier: PropTypes.string.isRequired,
    enabled: PropTypes.bool.isRequired,
    type: PropTypes.oneOf(['Bidding', 'Category', 'Basic', 'Freestar']),
};

export default connect(
    (state, props) => {
        const enabled =
            !!state.app.getIn(['googleAds', 'gptEnabled']) &&
            !!process.env.BROWSER &&
            !!window.googletag;
        const postCategory = state.global.get('postCategory');
        const basicSlots = state.app.getIn(['googleAds', `gptBasicSlots`]);
        const biddingSlots = state.app.getIn(['googleAds', `gptBiddingSlots`]);
        const categorySlots = state.app.getIn([
            'googleAds',
            `gptCategorySlots`,
        ]);

        let slotName = props.slotName;
        if (!slotName) {
            slotName = props.id;
        }
        let type = props.type;
        let slot = slotName; // in case it's Freestar
        if (type != 'Freestar') {
            slot = state.app.getIn(['googleAds', `gpt${type}Slots`, slotName]);
        }

        return {
            enabled,
            ad: slot,
            ad_identifier: slotName,
            ...props,
        };
    },
    dispatch => ({})
)(GptAd);
