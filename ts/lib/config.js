"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _0x_js_1 = require("0x.js");
// Network port to listen on
exports.HTTP_PORT = 5000;
// A time window after which the order is considered permanently expired
exports.ORDER_SHADOWING_MARGIN_MS = 100 * 1000; // tslint:disable-line custom-no-magic-numbers
// Frequency of checks for permanently expired orders
exports.PERMANENT_CLEANUP_INTERVAL_MS = 10 * 1000; // tslint:disable-line custom-no-magic-numbers
// Max number of entities per page
exports.MAX_PER_PAGE = 1000;
// Default network id to use when not specified
exports.NETWORK_ID = 42;
// An array of fee recipients
exports.FEE_RECIPIENT = '0x0000000000000000000000000000000000000000';
// A flat fee in ZRX that should be charged to the order maker
exports.MAKER_FEE_ZRX_UNIT_AMOUNT = new _0x_js_1.BigNumber(0);
// A flat fee in ZRX that should be charged to the order taker
exports.TAKER_FEE_ZRX_UNIT_AMOUNT = new _0x_js_1.BigNumber(0);
// Whitelisted token addresses. Set to a '*' instead of an array to allow all tokens.
exports.WHITELISTED_TOKENS = [
    '0x2002d3812f58e35f0ea1ffbf80a75a38c32175fa',
    '0xd0a1e359811322d97991e03f863a0c30c2cf029c',
    '0xe51fb5d397ec489440bdee59fe87f34c37217e4c',
    '0x4b732bde86748c9a387d36ecfcb91cbd8828db4c',
    '0x4e4eB589150fabF451Ed030600Ebd7241b66DB92',
];
// Ethereum RPC url
exports.RPC_URL = 'https://kovan.infura.io/v3';
// Default ERC20 token precision
exports.DEFAULT_ERC20_TOKEN_PRECISION = 18;
