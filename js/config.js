'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
// tslint:disable:custom-no-magic-numbers
const _0x_js_1 = require('0x.js');
const crypto = require('crypto');
const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const metadataPath = path.join(__dirname, '../../metadata.json');
const metadata = JSON.parse(fs.readFileSync(metadataPath).toString());
// Network port to listen on
exports.HTTP_PORT = !_.isEmpty(process.env.HTTP_PORT) ? _.parseInt(process.env.HTTP_PORT) : 3000;
// A time window after which the order is considered permanently expired
exports.ORDER_SHADOWING_MARGIN_MS = 100 * 1000; // tslint:disable-line custom-no-magic-numbers
// Frequency of checks for permanently expired orders
exports.PERMANENT_CLEANUP_INTERVAL_MS = 10 * 1000; // tslint:disable-line custom-no-magic-numbers
// Max number of entities per page
exports.MAX_PER_PAGE = 1000;
// Default network id to use when not specified
exports.NETWORK_ID = !_.isEmpty(process.env.NETWORK_ID) ? _.parseInt(process.env.NETWORK_ID) : 42;
// The fee recipient for orders
exports.FEE_RECIPIENT = !_.isEmpty(process.env.FEE_RECIPIENT) ? process.env.FEE_RECIPIENT : getDefaultFeeRecipient();
// A flat fee in ZRX that should be charged to the order maker
exports.MAKER_FEE_ZRX_UNIT_AMOUNT = !_.isEmpty(process.env.MAKER_FEE_ZRX_UNIT_AMOUNT)
    ? new _0x_js_1.BigNumber(_.parseInt(process.env.MAKER_FEE_ZRX_UNIT_AMOUNT))
    : new _0x_js_1.BigNumber(0);
// A flat fee in ZRX that should be charged to the order taker
exports.TAKER_FEE_ZRX_UNIT_AMOUNT = !_.isEmpty(process.env.TAKER_FEE_ZRX_UNIT_AMOUNT)
    ? new _0x_js_1.BigNumber(_.parseInt(process.env.TAKER_FEE_ZRX_UNIT_AMOUNT))
    : new _0x_js_1.BigNumber(0);
// Whitelisted token addresses. Set to a '*' instead of an array to allow all tokens.
exports.WHITELISTED_TOKENS = [
    '0x2002d3812f58e35f0ea1ffbf80a75a38c32175fa',
    '0xd0a1e359811322d97991e03f863a0c30c2cf029c',
];
// Ethereum RPC url
exports.RPC_URL = !_.isEmpty(process.env.RPC_URL) ? process.env.RPC_URL : 'https://kovan.infura.io/v3';
// Default ERC20 token precision
exports.DEFAULT_ERC20_TOKEN_PRECISION = 18;
function getDefaultFeeRecipient() {
    const existingDefault = metadata.DEFAULT_FEE_RECIPIENT;
    const newDefault = existingDefault || `0xABCABC${crypto.randomBytes(17).toString('hex')}`;
    if (existingDefault === '') {
        const metadataCopy = JSON.parse(JSON.stringify(metadata));
        metadataCopy.DEFAULT_FEE_RECIPIENT = newDefault;
        fs.writeFileSync(metadataPath, JSON.stringify(metadataCopy));
    }
    return newDefault;
}
