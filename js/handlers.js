"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _0x_js_1 = require("0x.js");
const HttpStatus = require("http-status-codes");
const _ = require("lodash");
const asset_pairs_1 = require("./asset_pairs");
const orderbook_1 = require("./orderbook");
const utils_1 = require("./utils");
const GANACHE_NETWORK_ID = 50;
const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
const ASSET_PAIRS = [
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
const assetPairs = new asset_pairs_1.AssetPairs(ASSET_PAIRS);
exports.handlers = {
    assetPairs: (req, res) => {
        const assetPairsResponse = assetPairs.get(req.query.assetDataA, req.query.assetDataB);
        res.status(HttpStatus.OK).send(assetPairsResponse);
    },
    orders: (_req, res) => {
        res.status(HttpStatus.NOT_IMPLEMENTED).send();
    },
    feeRecipients: (_req, res) => {
        res.status(HttpStatus.NOT_IMPLEMENTED).send();
    },
    orderbook: (req, res) => {
        utils_1.utils.log('HTTP: GET orderbook');
        const baseAssetData = req.query.baseAssetData;
        const quoteAssetData = req.query.quoteAssetData;
        const networkId = parseNetworkId(req.query.networkId);
        if (networkId !== GANACHE_NETWORK_ID) {
            utils_1.utils.log(`Incorrect Network ID: ${networkId}`);
            res.status(HttpStatus.BAD_REQUEST);
        }
        else {
            const orderbookResponse = orderbook_1.orderBook.get(baseAssetData, quoteAssetData);
            res.status(HttpStatus.OK).send(orderbookResponse);
        }
    },
    orderConfig: (req, res) => {
        utils_1.utils.log('HTTP: GET order config');
        const networkId = parseNetworkId(req.query.networkId);
        if (networkId !== GANACHE_NETWORK_ID) {
            utils_1.utils.log(`Incorrect Network ID: ${networkId}`);
            res.status(HttpStatus.BAD_REQUEST);
        }
        else {
            const orderConfigResponse = {
                senderAddress: NULL_ADDRESS,
                feeRecipientAddress: NULL_ADDRESS,
                makerFee: 0,
                takerFee: '1000',
            };
            res.status(HttpStatus.OK).send(orderConfigResponse);
        }
    },
    order: (req, res) => {
        utils_1.utils.log('HTTP: POST order');
        const networkId = parseNetworkId(req.query.networkId);
        if (networkId !== GANACHE_NETWORK_ID) {
            utils_1.utils.log(`Incorrect Network ID: ${networkId}`);
            res.status(HttpStatus.BAD_REQUEST);
        }
        else {
            const signedOrder = unmarshallOrder(req.body);
            orderbook_1.orderBook.addOrder(signedOrder);
            res.status(HttpStatus.OK);
        }
    },
};
function parseNetworkId(networkIdStrIfExists) {
    if (_.isUndefined(networkIdStrIfExists)) {
        return GANACHE_NETWORK_ID;
    }
    else {
        // tslint:disable-next-line:custom-no-magic-numbers
        const networkId = parseInt(networkIdStrIfExists, 10);
        return networkId;
    }
}
// As the orders come in as JSON they need to be turned into the correct types such as BigNumber
function unmarshallOrder(signedOrderRaw) {
    const signedOrder = Object.assign({}, signedOrderRaw, { salt: new _0x_js_1.BigNumber(signedOrderRaw.salt), makerAssetAmount: new _0x_js_1.BigNumber(signedOrderRaw.makerAssetAmount), takerAssetAmount: new _0x_js_1.BigNumber(signedOrderRaw.takerAssetAmount), makerFee: new _0x_js_1.BigNumber(signedOrderRaw.makerFee), takerFee: new _0x_js_1.BigNumber(signedOrderRaw.takerFee), expirationTimeSeconds: new _0x_js_1.BigNumber(signedOrderRaw.expirationTimeSeconds) });
    return signedOrder;
}
