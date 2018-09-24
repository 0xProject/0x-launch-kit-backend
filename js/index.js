"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _0x_js_1 = require("0x.js");
const bodyParser = require("body-parser");
const express = require("express");
// tslint:disable:no-console
const HTTP_OK_STATUS = 200;
const HTTP_BAD_REQUEST_STATUS = 400;
const HTTP_PORT = 3000;
const GANACHE_NETWORK_ID = 50;
const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
// Global state
const orders = [];
const ordersByHash = {};
// HTTP Server
const app = express();
app.use(bodyParser.json());
/**
 * GET Orderbook endpoint retrieves the orderbook for a given asset pair.
 * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrderbook
 */
app.get('/v2/orderbook', (req, res) => {
    console.log('HTTP: GET orderbook');
    const baseAssetData = req.query.baseAssetData;
    const quoteAssetData = req.query.quoteAssetData;
    const networkIdRaw = req.query.networkId;
    // tslint:disable-next-line:custom-no-magic-numbers
    const networkId = parseInt(networkIdRaw, 10);
    if (networkId !== GANACHE_NETWORK_ID) {
        console.log(`Incorrect Network ID: ${networkId}`);
        res.status(HTTP_BAD_REQUEST_STATUS).send({});
    }
    else {
        const orderbookResponse = renderOrderbookResponse(baseAssetData, quoteAssetData);
        res.status(HTTP_OK_STATUS).send(orderbookResponse);
    }
});
/**
 * GET Order config endpoint retrives the values for order fields that the relayer requires.
 * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrderConfig
 */
app.get('/v2/order_config', (req, res) => {
    console.log('HTTP: GET order config');
    const networkIdRaw = req.query.networkId;
    // tslint:disable-next-line:custom-no-magic-numbers
    const networkId = parseInt(networkIdRaw, 10);
    if (networkId !== GANACHE_NETWORK_ID) {
        console.log(`Incorrect Network ID: ${networkId}`);
        res.status(HTTP_BAD_REQUEST_STATUS).send({});
    }
    else {
        const orderConfigResponse = {
            senderAddress: NULL_ADDRESS,
            feeRecipientAddress: NULL_ADDRESS,
            makerFee: 0,
            takerFee: '1000',
        };
        res.status(HTTP_OK_STATUS).send(orderConfigResponse);
    }
});
/**
 * POST Order endpoint submits an order to the Relayer.
 * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/postOrder
 */
app.post('/v2/order', (req, res) => {
    console.log('HTTP: POST order');
    const networkIdRaw = req.query.networkId;
    // tslint:disable-next-line:custom-no-magic-numbers
    const networkId = parseInt(networkIdRaw, 10);
    if (networkId !== GANACHE_NETWORK_ID) {
        console.log(`Incorrect Network ID: ${networkId}`);
        res.status(HTTP_BAD_REQUEST_STATUS).send({});
    }
    else {
        const signedOrder = parseHTTPOrder(req.body);
        const orderHash = _0x_js_1.orderHashUtils.getOrderHashHex(signedOrder);
        ordersByHash[orderHash] = signedOrder;
        orders.push(signedOrder);
        res.status(HTTP_OK_STATUS).send({});
    }
});
app.listen(HTTP_PORT, () => console.log(`Standard relayer API (HTTP) listening on port ${HTTP_PORT}!`));
function renderOrderbookResponse(baseAssetData, quoteAssetData) {
    const bidOrders = orders.filter(order => order.takerAssetData === baseAssetData && order.makerAssetData === quoteAssetData);
    const askOrders = orders.filter(order => order.takerAssetData === quoteAssetData && order.makerAssetData === baseAssetData);
    const bidApiOrders = bidOrders.map(order => ({ metaData: {}, order }));
    const askApiOrders = askOrders.map(order => ({ metaData: {}, order }));
    return {
        bids: {
            records: bidApiOrders,
            page: 1,
            perPage: 100,
            total: bidOrders.length,
        },
        asks: {
            records: askApiOrders,
            page: 1,
            perPage: 100,
            total: askOrders.length,
        },
    };
}
// As the orders come in as JSON they need to be turned into the correct types such as BigNumber
function parseHTTPOrder(signedOrderRaw) {
    const signedOrder = Object.assign({}, signedOrderRaw, { salt: new _0x_js_1.BigNumber(signedOrderRaw.salt), makerAssetAmount: new _0x_js_1.BigNumber(signedOrderRaw.makerAssetAmount), takerAssetAmount: new _0x_js_1.BigNumber(signedOrderRaw.takerAssetAmount), makerFee: new _0x_js_1.BigNumber(signedOrderRaw.makerFee), takerFee: new _0x_js_1.BigNumber(signedOrderRaw.takerFee), expirationTimeSeconds: new _0x_js_1.BigNumber(signedOrderRaw.expirationTimeSeconds) });
    return signedOrder;
}
