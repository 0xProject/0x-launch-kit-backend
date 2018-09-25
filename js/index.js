"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bodyParser = require("body-parser");
const express = require("express");
const config_1 = require("./config");
const handlers_1 = require("./handlers");
const utils_1 = require("./utils");
const app = express();
app.use(bodyParser.json());
/**
 * GET AssetPairs endpoint retrieves a list of available asset pairs and the information required to trade them.
 * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getAssetPairs
 */
app.get('/v2/asset_pairs', handlers_1.handlers.assetPairs);
/**
 * GET Orders endpoint retrieves a list of orders given query parameters.
 * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrders
 */
app.get('/v2/orders', handlers_1.handlers.orders);
/**
 * GET Orderbook endpoint retrieves the orderbook for a given asset pair.
 * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrderbook
 */
app.get('/v2/orderbook', handlers_1.handlers.orderbook);
/**
 * GET Order config endpoint retrives the values for order fields that the relayer requires.
 * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrderConfig
 */
app.get('/v2/order_config', handlers_1.handlers.orderConfig);
/**
 * GET FeeRecepients endpoint retrieves a collection of all fee recipient addresses for a relayer.
 * http://sra-spec.s3-website-us-east-1.amazonaws.com/v2/fee_recipients
 */
app.get('/v2/fee_recipients', handlers_1.handlers.feeRecipients);
/**
 * POST Order endpoint submits an order to the Relayer.
 * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/postOrder
 */
app.post('/v2/order', handlers_1.handlers.postOrder);
/**
 * GET Order endpoint retrieves the order by order hash.
 * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrder
 */
app.get('/v2/order/:orderHash', handlers_1.handlers.getOrderByHash);
app.listen(config_1.HTTP_PORT, () => utils_1.utils.log(`Standard relayer API (HTTP) listening on port ${config_1.HTTP_PORT}!`));
