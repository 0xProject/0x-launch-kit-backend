import { BigNumber } from '0x.js';
import * as _ from 'lodash';

import * as config from '../../config.json';

export const HTTP_PORT = config.HTTP_PORT;
export const MAX_PER_PAGE = config.MAX_PER_PAGE;
export const NETWORK_ID = config.NETWORK_ID;
export const FEE_RECIPIENTS = config.FEE_RECIPIENTS;
export const ASSET_PAIRS = _.map(config.ASSET_PAIRS, assetPair => ({
    assetDataA: {
        precision: assetPair.assetDataA.precision,
        assetData: assetPair.assetDataA.assetData,
        minAmount: new BigNumber(assetPair.assetDataA.minAmount),
        maxAmount: new BigNumber(assetPair.assetDataA.maxAmount),
    },
    assetDataB: {
        precision: assetPair.assetDataB.precision,
        assetData: assetPair.assetDataB.assetData,
        minAmount: new BigNumber(assetPair.assetDataB.minAmount),
        maxAmount: new BigNumber(assetPair.assetDataB.maxAmount),
    },
}));

export const RPC_URL = config.RPC_URL;
