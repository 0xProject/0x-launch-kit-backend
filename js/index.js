"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("@babel/polyfill");
const bodyParser = require("body-parser");
const cors = require("cors");
const express = require("express");
const asyncHandler = require("express-async-handler");
require("reflect-metadata");
const config = require("./config");
const db_connection_1 = require("./db_connection");
const handlers_1 = require("./handlers");
const error_handling_1 = require("./middleware/error_handling");
const url_params_parsing_1 = require("./middleware/url_params_parsing");
const utils_1 = require("./utils");
(async () => {
    await db_connection_1.initDBConnectionAsync();
    const handlers = new handlers_1.Handlers();
    await handlers.initOrderBookAsync();
    const app = express();
    app.use(cors());
    app.use(bodyParser.json());
    app.use(url_params_parsing_1.urlParamsParsing);
    /**
     * GET AssetPairs endpoint retrieves a list of available asset pairs and the information required to trade them.
     * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getAssetPairs
     */
    app.get('/v2/asset_pairs', asyncHandler(handlers_1.Handlers.assetPairsAsync.bind(handlers_1.Handlers)));
    /**
     * GET Orders endpoint retrieves a list of orders given query parameters.
     * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrders
     */
    app.get('/v2/orders', asyncHandler(handlers.ordersAsync.bind(handlers)));
    /**
     * GET Orderbook endpoint retrieves the orderbook for a given asset pair.
     * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrderbook
     */
    app.get('/v2/orderbook', asyncHandler(handlers.orderbookAsync.bind(handlers)));
    /**
     * POST Order config endpoint retrives the values for order fields that the relayer requires.
     * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrderConfig
     */
    app.post('/v2/order_config', handlers_1.Handlers.orderConfig.bind(handlers_1.Handlers));
    /**
     * GET FeeRecepients endpoint retrieves a collection of all fee recipient addresses for a relayer.
     * http://sra-spec.s3-website-us-east-1.amazonaws.com/v2/fee_recipients
     */
    app.get('/v2/fee_recipients', handlers_1.Handlers.feeRecipients.bind(handlers_1.Handlers));
    /**
     * POST Order endpoint submits an order to the Relayer.
     * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/postOrder
     */
    app.post('/v2/order', asyncHandler(handlers.postOrderAsync.bind(handlers)));
    /**
     * GET Order endpoint retrieves the order by order hash.
     * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrder
     */
    app.get('/v2/order/:orderHash', asyncHandler(handlers_1.Handlers.getOrderByHashAsync.bind(handlers_1.Handlers)));
    app.use(error_handling_1.errorHandler);
    app.listen(config.HTTP_PORT, () => {
        utils_1.utils.log(`Standard relayer API (HTTP) listening on port ${config.HTTP_PORT}!\nConfig: ${JSON.stringify(config, null, 2)}`);
    });
})().catch(utils_1.utils.log);
