'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
// tslint:disable:custom-no-magic-numbers
const _0x_js_1 = require('0x.js');
const _ = require('lodash');
// Network port to listen on
exports.HTTP_PORT = process.env.HTTP_PORT || 3000;
// A time window after which the order is considered permanently expired
exports.ORDER_SHADOWING_MARGIN_MS = 100 * 1000; // tslint:disable-line custom-no-magic-numbers
// Frequency of checks for permanently expired orders
exports.PERMANENT_CLEANUP_INTERVAL_MS = 10 * 1000; // tslint:disable-line custom-no-magic-numbers
// Max number of entities per page
exports.MAX_PER_PAGE = 1000;
// Default network id to use when not specified
exports.NETWORK_ID = !_.isUndefined(process.env.NETWORK_ID) ? _.parseInt(process.env.NETWORK_ID) : 42;
// The fee recipient for orders
exports.FEE_RECIPIENT = !_.isUndefined(process.env.FEE_RECIPIENT)
    ? process.env.FEE_RECIPIENT
    : '0x0000000000000000000000000000000000000000';
// A flat fee in ZRX that should be charged to the order maker
exports.MAKER_FEE_ZRX_UNIT_AMOUNT = !_.isUndefined(process.env.MAKER_FEE_ZRX_UNIT_AMOUNT)
    ? new _0x_js_1.BigNumber(process.env.MAKER_FEE_ZRX_UNIT_AMOUNT)
    : new _0x_js_1.BigNumber(0);
// A flat fee in ZRX that should be charged to the order taker
exports.TAKER_FEE_ZRX_UNIT_AMOUNT = !_.isUndefined(process.env.TAKER_FEE_ZRX_UNIT_AMOUNT)
    ? new _0x_js_1.BigNumber(process.env.TAKER_FEE_ZRX_UNIT_AMOUNT)
    : new _0x_js_1.BigNumber(0);
// Whitelisted token addresses. Set to a '*' instead of an array to allow all tokens.
exports.WHITELISTED_TOKENS = [
    '0x2002d3812f58e35f0ea1ffbf80a75a38c32175fa',
    '0xd0a1e359811322d97991e03f863a0c30c2cf029c',
];
// Ethereum RPC url
exports.RPC_URL = process.env.RPC_URL || 'https://kovan.infura.io/v3';
// Default ERC20 token precision
exports.DEFAULT_ERC20_TOKEN_PRECISION = 18;
