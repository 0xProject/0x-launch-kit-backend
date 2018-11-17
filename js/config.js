"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _0x_js_1 = require("0x.js");
// Network port to listen on
exports.HTTP_PORT = process.env.HTTP_PORT || 3000;
// A time window after which the order is considered permanently expired
exports.ORDER_SHADOWING_MARGIN_MS = 100 * 1000; // tslint:disable-line custom-no-magic-numbers
// Frequency of checks for permanently expired orders
exports.PERMANENT_CLEANUP_INTERVAL_MS = 10 * 1000; // tslint:disable-line custom-no-magic-numbers
// Max number of entities per page
exports.MAX_PER_PAGE = 100;
// Default network id to use when not specified
exports.NETWORK_ID = 1;
// An array of fee recipients
exports.FEE_RECIPIENT = '0x0000000000000000000000000000000000000000';
// A flat fee in ZRX that should be charged to the order maker
exports.MAKER_FEE_ZRX_UNIT_AMOUNT = new _0x_js_1.BigNumber(0);
// A flat fee in ZRX that should be charged to the order taker
exports.TAKER_FEE_ZRX_UNIT_AMOUNT = new _0x_js_1.BigNumber(0);
// Whitelisted token addresses. Set to a '*' instead of an array to allow any token.
exports.WHITELISTED_TOKENS = [];
// Ethereum RPC url
exports.RPC_URL = 'https://mainnet.infura.io';
// Default ERC20 token precision
exports.DEFAULT_ERC20_TOKEN_PRECISION = 18;
