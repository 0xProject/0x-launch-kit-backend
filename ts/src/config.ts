import { BigNumber } from '0x.js';
import * as _ from 'lodash';

// Network port to listen on
export const HTTP_PORT = 3000;
// A time window after which the order is considered permanently expired
export const ORDER_SHADOWING_MARGIN_MS = 100 * 1000; // tslint:disable-line custom-no-magic-numbers
// Frequency of checks for permanently expired orders
export const PERMANENT_CLEANUP_INTERVAL_MS = 10 * 1000; // tslint:disable-line custom-no-magic-numbers
// Max number of entities per page
export const MAX_PER_PAGE = 100;
// Default network id to use when not specified
export const NETWORK_ID = 1;
// An array of fee recipients
export const FEE_RECIPIENT = '0x0000000000000000000000000000000000000000';
// A flat fee in ZRX that should be charged to the order maker
export const MAKER_FEE_ZRX_UNIT_AMOUNT = new BigNumber(0);
// A flat fee in ZRX that should be charged to the order taker
export const TAKER_FEE_ZRX_UNIT_AMOUNT = new BigNumber(0);
// Tradable asset pairs
export const ASSET_PAIRS = [
    {
        assetDataA: {
            minAmount: new BigNumber(0),
            maxAmount: new BigNumber(0),
            precision: 5,
            assetData: '0xf47261b0f47261b04c32345ced77393b3530b1eed0f346429d',
        },
        assetDataB: {
            minAmount: new BigNumber(0),
            maxAmount: new BigNumber(0),
            precision: 5,
            assetData: '0xf47261b00257179264389b814a946f3e92105513705ca6b990',
        },
    },
    {
        assetDataA: {
            minAmount: new BigNumber(0),
            maxAmount: new BigNumber(1),
            precision: 1,
            assetData: '0xf47261b0000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        },
        assetDataB: {
            minAmount: new BigNumber(0),
            maxAmount: new BigNumber(1),
            precision: 1,
            assetData: '0xf47261b000000000000000000000000024cebc1548e698feffb5553b8ac8043b51069faa',
        },
    },
];
// Ethereum RPC url
export const RPC_URL = 'https://mainnet.infura.io';
