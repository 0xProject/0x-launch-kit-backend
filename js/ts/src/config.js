"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _0x_js_1 = require("0x.js");
const _ = require("lodash");
const config_1 = require("../../config");
exports.HTTP_PORT = config_1.config.HTTP_PORT;
exports.ORDER_SHADOWING_MARGIN_MS = config_1.config.ORDER_SHADOWING_MARGIN_MS;
exports.PERMANENT_CLEANUP_INTERVAL_MS = config_1.config.PERMANENT_CLEANUP_INTERVAL_MS;
exports.MAX_PER_PAGE = config_1.config.MAX_PER_PAGE;
exports.NETWORK_ID = config_1.config.NETWORK_ID;
exports.FEE_RECIPIENTS = config_1.config.FEE_RECIPIENTS;
exports.ASSET_PAIRS = _.map(config_1.config.ASSET_PAIRS, assetPair => ({
    assetDataA: {
        precision: assetPair.assetDataA.precision,
        assetData: assetPair.assetDataA.assetData,
        minAmount: new _0x_js_1.BigNumber(assetPair.assetDataA.minAmount),
        maxAmount: new _0x_js_1.BigNumber(assetPair.assetDataA.maxAmount),
    },
    assetDataB: {
        precision: assetPair.assetDataB.precision,
        assetData: assetPair.assetDataB.assetData,
        minAmount: new _0x_js_1.BigNumber(assetPair.assetDataB.minAmount),
        maxAmount: new _0x_js_1.BigNumber(assetPair.assetDataB.maxAmount),
    },
}));
exports.RPC_URL = config_1.config.RPC_URL;
