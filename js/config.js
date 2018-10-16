'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const _0x_js_1 = require('0x.js');
const DEFAULT_HTTP_PORT = 3000;
exports.HTTP_PORT = process.env.PORT || DEFAULT_HTTP_PORT;
const GANACHE_NETWORK_ID = 50;
exports.DEFAULT_NETWORK_ID = GANACHE_NETWORK_ID;
// TODO(leo): Load those from config.
exports.FEE_RECIPIENTS = [
    '0x6eC92694ea172ebC430C30fa31De87620967A082',
    '0x9e56625509c2f60af937f23b7b532600390e8c8b',
    '0xa2b31dacf30a9c50ca473337c01d8a201ae33e32',
];
// TODO(leo): Load those from config.
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
];
//# sourceMappingURL=config.js.map
