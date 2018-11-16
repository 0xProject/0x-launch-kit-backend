"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _0x_js_1 = require("0x.js");
const json_schemas_1 = require("@0x/json-schemas");
const web3_wrapper_1 = require("@0x/web3-wrapper");
const HttpStatus = require("http-status-codes");
const _ = require("lodash");
const asset_pairs_store_1 = require("./asset_pairs_store");
const config_1 = require("./config");
const constants_1 = require("./constants");
const errors_1 = require("./errors");
const orderbook_1 = require("./orderbook");
const paginator_1 = require("./paginator");
const utils_1 = require("./utils");
const assetPairsStore = new asset_pairs_store_1.AssetPairsStore(config_1.ASSET_PAIRS);
const parsePaginationConfig = (req) => {
    const page = _.isUndefined(req.query.page) ? constants_1.DEFAULT_PAGE : Number(req.query.page);
    const perPage = _.isUndefined(req.query.perPage) ? constants_1.DEFAULT_PER_PAGE : Number(req.query.perPage);
    if (perPage > config_1.MAX_PER_PAGE) {
        throw new errors_1.ValidationError([
            {
                field: 'perPage',
                code: errors_1.ValidationErrorCodes.valueOutOfRange,
                reason: `perPage should be less or equal to ${config_1.MAX_PER_PAGE}`,
            },
        ]);
    }
    return { page, perPage };
};
exports.handlers = {
    assetPairs: (req, res) => {
        utils_1.utils.validateSchema(req.query, json_schemas_1.schemas.assetPairsRequestOptsSchema);
        const { page, perPage } = parsePaginationConfig(req);
        const assetPairs = assetPairsStore.get(page, perPage, req.query.assetDataA, req.query.assetDataB);
        res.status(HttpStatus.OK).send(assetPairs);
    },
    ordersAsync: async (req, res) => {
        utils_1.utils.validateSchema(req.query, json_schemas_1.schemas.ordersRequestOptsSchema);
        const { page, perPage } = parsePaginationConfig(req);
        const paginatedOrders = await orderbook_1.orderBook.getOrdersAsync(page, perPage, req.query);
        res.status(HttpStatus.OK).send(paginatedOrders);
    },
    feeRecipients: (req, res) => {
        const { page, perPage } = parsePaginationConfig(req);
        const FEE_RECIPIENTS = [config_1.FEE_RECIPIENT];
        const paginatedFeeRecipients = paginator_1.paginate(FEE_RECIPIENTS, page, perPage);
        res.status(HttpStatus.OK).send(paginatedFeeRecipients);
    },
    orderbookAsync: async (req, res) => {
        utils_1.utils.validateSchema(req.query, json_schemas_1.schemas.orderBookRequestSchema);
        const { page, perPage } = parsePaginationConfig(req);
        const baseAssetData = req.query.baseAssetData;
        const quoteAssetData = req.query.quoteAssetData;
        const orderbookResponse = await orderbook_1.orderBook.getOrderBookAsync(page, perPage, baseAssetData, quoteAssetData);
        res.status(HttpStatus.OK).send(orderbookResponse);
    },
    orderConfig: (req, res) => {
        utils_1.utils.validateSchema(req.body, json_schemas_1.schemas.orderConfigRequestSchema);
        const orderConfigResponse = {
            senderAddress: constants_1.NULL_ADDRESS,
            feeRecipientAddress: config_1.FEE_RECIPIENT,
            makerFee: web3_wrapper_1.Web3Wrapper.toBaseUnitAmount(config_1.MAKER_FEE_ZRX_UNIT_AMOUNT, constants_1.ZRX_DECIMALS).toString(),
            takerFee: web3_wrapper_1.Web3Wrapper.toBaseUnitAmount(config_1.TAKER_FEE_ZRX_UNIT_AMOUNT, constants_1.ZRX_DECIMALS).toString(),
        };
        res.status(HttpStatus.OK).send(orderConfigResponse);
    },
    postOrderAsync: async (req, res) => {
        utils_1.utils.validateSchema(req.body, json_schemas_1.schemas.signedOrderSchema);
        const signedOrder = unmarshallOrder(req.body);
        if (!assetPairsStore.includes(signedOrder.makerAssetData, signedOrder.takerAssetData)) {
            throw new errors_1.ValidationError([
                {
                    field: 'assetPair',
                    code: errors_1.ValidationErrorCodes.valueOutOfRange,
                    reason: 'Asset pair not supported',
                },
            ]);
        }
        await orderbook_1.orderBook.addOrderAsync(signedOrder);
        res.status(HttpStatus.OK).send();
    },
    getOrderByHashAsync: async (req, res) => {
        const orderIfExists = await orderbook_1.orderBook.getOrderByHashIfExistsAsync(req.params.orderHash);
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
    const signedOrder = {
        ...signedOrderRaw,
        salt: new _0x_js_1.BigNumber(signedOrderRaw.salt),
        makerAssetAmount: new _0x_js_1.BigNumber(signedOrderRaw.makerAssetAmount),
        takerAssetAmount: new _0x_js_1.BigNumber(signedOrderRaw.takerAssetAmount),
        makerFee: new _0x_js_1.BigNumber(signedOrderRaw.makerFee),
        takerFee: new _0x_js_1.BigNumber(signedOrderRaw.takerFee),
        expirationTimeSeconds: new _0x_js_1.BigNumber(signedOrderRaw.expirationTimeSeconds),
    };
    return signedOrder;
}
