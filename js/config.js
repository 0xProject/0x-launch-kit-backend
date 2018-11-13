"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _0x_js_1 = require("0x.js");
// Network port to listen on
exports.HTTP_PORT = 3000;
// A time window after which the order is considered permanently expired
exports.ORDER_SHADOWING_MARGIN_MS = 100 * 1000; // tslint:disable-line custom-no-magic-numbers
// Frequency of checks for permanently expired orders
exports.PERMANENT_CLEANUP_INTERVAL_MS = 10 * 1000; // tslint:disable-line custom-no-magic-numbers
// Max number of entities per page
exports.MAX_PER_PAGE = 100;
// Default network id to use when not specified
exports.NETWORK_ID = 1;
// An array of fee recipients
exports.FEE_RECIPIENTS = ['0x0000000000000000000000000000000000000000'];
// Tradable asset pairs
exports.ASSET_PAIRS = [
    {
        assetDataA: {
            minAmount: new _0x_js_1.BigNumber(0),
            maxAmount: new _0x_js_1.BigNumber(0),
            precision: 5,
            assetData: '0xf47261b04c32345ced77393b3530b1eed0f346429d',
        },
        assetDataB: {
            minAmount: new _0x_js_1.BigNumber(0),
            maxAmount: new _0x_js_1.BigNumber(0),
            precision: 5,
            assetData: '0x0257179264389b814a946f3e92105513705ca6b990',
        },
    },
    {
        assetDataA: {
            minAmount: new _0x_js_1.BigNumber(0),
            maxAmount: new _0x_js_1.BigNumber(1),
            precision: 1,
            assetData: '0xf47261b0000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        },
        assetDataB: {
            minAmount: new _0x_js_1.BigNumber(0),
            maxAmount: new _0x_js_1.BigNumber(1),
            precision: 1,
            assetData: '0xf47261b000000000000000000000000024cebc1548e698feffb5553b8ac8043b51069faa',
        },
    },
];
// Ethereum RPC url
exports.RPC_URL = 'https://mainnet.infura.io';
