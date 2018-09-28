"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _0x_js_1 = require("0x.js");
const HttpStatus = require("http-status-codes");
const _ = require("lodash");
const asset_pairs_store_1 = require("./asset_pairs_store");
const config_1 = require("./config");
const constants_1 = require("./constants");
const errors_1 = require("./errors");
const orderbook_1 = require("./orderbook");
const paginator_1 = require("./paginator");
const assetPairsStore = new asset_pairs_store_1.AssetPairsStore(config_1.ASSET_PAIRS);
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
        const paginatedFeeRecipients = paginator_1.paginate(config_1.FEE_RECIPIENTS);
        res.status(HttpStatus.OK).send(paginatedFeeRecipients);
    },
    orderbook: (req, res) => {
        const baseAssetData = req.query.baseAssetData;
        const quoteAssetData = req.query.quoteAssetData;
        const orderbookResponse = orderbook_1.orderBook.getOrderBook(baseAssetData, quoteAssetData);
        res.status(HttpStatus.OK).send(orderbookResponse);
    },
    orderConfig: (_req, res) => {
        const orderConfigResponse = {
            senderAddress: constants_1.NULL_ADDRESS,
            feeRecipientAddress: constants_1.NULL_ADDRESS,
            makerFee: 0,
            takerFee: '1000',
        };
        res.status(HttpStatus.OK).send(orderConfigResponse);
    },
    postOrder: (req, res) => {
        const signedOrder = unmarshallOrder(req.body);
        orderbook_1.orderBook.addOrder(signedOrder);
        res.status(HttpStatus.OK).send();
    },
    getOrderByHash: (_req, res) => {
        const orderIfExists = orderbook_1.orderBook.getOrderByHashIfExists(_req.params.orderHash);
        if (_.isUndefined(orderIfExists)) {
            throw new errors_1.NotFoundError();
        }
        else {
            res.status(HttpStatus.OK).send(orderIfExists);
        }
    },
};
// As the orders come in as JSON they need to be turned into the correct types such as BigNumber
function unmarshallOrder(signedOrderRaw) {
    const signedOrder = Object.assign({}, signedOrderRaw, { salt: new _0x_js_1.BigNumber(signedOrderRaw.salt), makerAssetAmount: new _0x_js_1.BigNumber(signedOrderRaw.makerAssetAmount), takerAssetAmount: new _0x_js_1.BigNumber(signedOrderRaw.takerAssetAmount), makerFee: new _0x_js_1.BigNumber(signedOrderRaw.makerFee), takerFee: new _0x_js_1.BigNumber(signedOrderRaw.takerFee), expirationTimeSeconds: new _0x_js_1.BigNumber(signedOrderRaw.expirationTimeSeconds) });
    return signedOrder;
}
