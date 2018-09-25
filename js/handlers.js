"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _0x_js_1 = require("0x.js");
const HttpStatus = require("http-status-codes");
const _ = require("lodash");
const asset_pairs_store_1 = require("./asset_pairs_store");
const orderbook_1 = require("./orderbook");
const paginator_1 = require("./paginator");
const utils_1 = require("./utils");
const GANACHE_NETWORK_ID = 50;
const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
// TODO(leo): Load those from config.
const FEE_RECIPIENTS = [
    '0x6eC92694ea172ebC430C30fa31De87620967A082',
    '0x9e56625509c2f60af937f23b7b532600390e8c8b',
    '0xa2b31dacf30a9c50ca473337c01d8a201ae33e32',
];
// TODO(leo): Load those from config.
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
const assetPairsStore = new asset_pairs_store_1.AssetPairsStore(ASSET_PAIRS);
// TODO(leo): Set proper json headers
// TODO(leo): Perform JSON schema validation on both request and response
exports.handlers = {
    assetPairs: (req, res) => {
        const assetPairs = assetPairsStore.get(req.query.assetDataA, req.query.assetDataB);
        const paginatedAssetPairs = paginator_1.paginate(assetPairs);
        res.status(HttpStatus.OK).send(paginatedAssetPairs);
    },
    orders: (_req, res) => {
        const orders = orderbook_1.orderBook.getOrders();
        const paginatedOrders = paginator_1.paginate(orders);
        res.status(HttpStatus.OK).send(paginatedOrders);
    },
    feeRecipients: (_req, res) => {
        const paginatedFeeRecipients = paginator_1.paginate(FEE_RECIPIENTS);
        res.status(HttpStatus.OK).send(paginatedFeeRecipients);
    },
    orderbook: (req, res) => {
        const baseAssetData = req.query.baseAssetData;
        const quoteAssetData = req.query.quoteAssetData;
        const networkId = parseNetworkId(req.query.networkId);
        if (networkId !== GANACHE_NETWORK_ID) {
            utils_1.utils.log(`Incorrect Network ID: ${networkId}`);
            res.status(HttpStatus.BAD_REQUEST).send();
        }
        else {
            const orderbookResponse = orderbook_1.orderBook.getOrderBook(baseAssetData, quoteAssetData);
            res.status(HttpStatus.OK).send(orderbookResponse);
        }
    },
    orderConfig: (req, res) => {
        const networkId = parseNetworkId(req.query.networkId);
        if (networkId !== GANACHE_NETWORK_ID) {
            utils_1.utils.log(`Incorrect Network ID: ${networkId}`);
            res.status(HttpStatus.BAD_REQUEST).send();
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
    postOrder: (req, res) => {
        const networkId = parseNetworkId(req.query.networkId);
        if (networkId !== GANACHE_NETWORK_ID) {
            utils_1.utils.log(`Incorrect Network ID: ${networkId}`);
            res.status(HttpStatus.BAD_REQUEST).send();
        }
        else {
            const signedOrder = unmarshallOrder(req.body);
            orderbook_1.orderBook.addOrder(signedOrder);
            res.status(HttpStatus.OK).send();
        }
    },
    getOrderByHash: (_req, res) => {
        const orderIfExists = orderbook_1.orderBook.getOrderByHashIfExists(_req.params.orderHash);
        if (_.isUndefined(orderIfExists)) {
            res.status(HttpStatus.NOT_FOUND).send();
        }
        else {
            res.status(HttpStatus.OK).send(orderIfExists);
        }
    },
};
// TODO(leo): Throw if networkId is unsupported
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
