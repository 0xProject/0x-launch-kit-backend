'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const _0x_js_1 = require('0x.js');
const json_schemas_1 = require('@0x/json-schemas');
const web3_wrapper_1 = require('@0x/web3-wrapper');
const HttpStatus = require('http-status-codes');
const _ = require('lodash');
const config_1 = require('./config');
const constants_1 = require('./constants');
const errors_1 = require('./errors');
const orderbook_1 = require('./orderbook');
const paginator_1 = require('./paginator');
const utils_1 = require('./utils');
const parsePaginationConfig = req => {
    const page = req.query.page === undefined ? constants_1.DEFAULT_PAGE : Number(req.query.page);
    const perPage = req.query.perPage === undefined ? constants_1.DEFAULT_PER_PAGE : Number(req.query.perPage);
    if (perPage > config_1.MAX_PER_PAGE) {
        throw new errors_1.ValidationError([
            {
                field: 'perPage',
                code: errors_1.ValidationErrorCodes.ValueOutOfRange,
                reason: `perPage should be less or equal to ${config_1.MAX_PER_PAGE}`,
            },
        ]);
    }
    return { page, perPage };
};
class Handlers {
    static feeRecipients(req, res) {
        const { page, perPage } = parsePaginationConfig(req);
        const normalizedFeeRecipient = config_1.FEE_RECIPIENT.toLowerCase();
        const feeRecipients = [normalizedFeeRecipient];
        const paginatedFeeRecipients = paginator_1.paginate(feeRecipients, page, perPage);
        res.status(HttpStatus.OK).send(paginatedFeeRecipients);
    }
    static orderConfig(req, res) {
        utils_1.utils.validateSchema(req.body, json_schemas_1.schemas.orderConfigRequestSchema);
        const normalizedFeeRecipient = config_1.FEE_RECIPIENT.toLowerCase();
        const orderConfigResponse = {
            senderAddress: constants_1.NULL_ADDRESS,
            feeRecipientAddress: normalizedFeeRecipient,
            makerFee: web3_wrapper_1.Web3Wrapper.toBaseUnitAmount(
                config_1.MAKER_FEE_ZRX_UNIT_AMOUNT,
                constants_1.ZRX_DECIMALS,
            ).toString(),
            takerFee: web3_wrapper_1.Web3Wrapper.toBaseUnitAmount(
                config_1.TAKER_FEE_ZRX_UNIT_AMOUNT,
                constants_1.ZRX_DECIMALS,
            ).toString(),
        };
        res.status(HttpStatus.OK).send(orderConfigResponse);
    }
    static async assetPairsAsync(req, res) {
        utils_1.utils.validateSchema(req.query, json_schemas_1.schemas.assetPairsRequestOptsSchema);
        const { page, perPage } = parsePaginationConfig(req);
        const assetPairs = await orderbook_1.OrderBook.getAssetPairsAsync(
            page,
            perPage,
            req.query.assetDataA,
            req.query.assetDataB,
        );
        res.status(HttpStatus.OK).send(assetPairs);
    }
    static async getOrderByHashAsync(req, res) {
        const orderIfExists = await orderbook_1.OrderBook.getOrderByHashIfExistsAsync(req.params.orderHash);
        if (orderIfExists === undefined) {
            throw new errors_1.NotFoundError();
        } else {
            res.status(HttpStatus.OK).send(orderIfExists);
        }
    }
    constructor() {
        this._orderBook = new orderbook_1.OrderBook();
    }
    async initOrderBookAsync() {
        await this._orderBook.addExistingOrdersToOrderWatcherAsync();
    }
    async ordersAsync(req, res) {
        utils_1.utils.validateSchema(req.query, json_schemas_1.schemas.ordersRequestOptsSchema);
        const { page, perPage } = parsePaginationConfig(req);
        const paginatedOrders = await this._orderBook.getOrdersAsync(page, perPage, req.query);
        res.status(HttpStatus.OK).send(paginatedOrders);
    }
    async orderbookAsync(req, res) {
        utils_1.utils.validateSchema(req.query, json_schemas_1.schemas.orderBookRequestSchema);
        const { page, perPage } = parsePaginationConfig(req);
        const baseAssetData = req.query.baseAssetData;
        const quoteAssetData = req.query.quoteAssetData;
        const orderbookResponse = await this._orderBook.getOrderBookAsync(page, perPage, baseAssetData, quoteAssetData);
        res.status(HttpStatus.OK).send(orderbookResponse);
    }
    async postOrderAsync(req, res) {
        utils_1.utils.validateSchema(req.body, json_schemas_1.schemas.signedOrderSchema);
        const signedOrder = unmarshallOrder(req.body);
        if (config_1.WHITELISTED_TOKENS !== '*') {
            const allowedTokens = config_1.WHITELISTED_TOKENS;
            validateAssetDataIsWhitelistedOrThrow(allowedTokens, signedOrder.makerAssetData, 'makerAssetData');
            validateAssetDataIsWhitelistedOrThrow(allowedTokens, signedOrder.takerAssetData, 'takerAssetData');
        }
        try {
            await this._orderBook.addOrderAsync(signedOrder);
        } catch (err) {
            throw new errors_1.ValidationError([
                {
                    field: 'signedOrder',
                    code: errors_1.ValidationErrorCodes.InvalidOrder,
                    reason: err.message,
                },
            ]);
        }
        res.status(HttpStatus.OK).send();
    }
}
exports.Handlers = Handlers;
function validateAssetDataIsWhitelistedOrThrow(allowedTokens, assetData, field) {
    const decodedAssetData = _0x_js_1.assetDataUtils.decodeAssetDataOrThrow(assetData);
    if (_0x_js_1.assetDataUtils.isMultiAssetData(decodedAssetData)) {
        for (const [, nestedAssetDataElement] of decodedAssetData.nestedAssetData.entries()) {
            validateAssetDataIsWhitelistedOrThrow(allowedTokens, nestedAssetDataElement, field);
        }
    } else if (!_0x_js_1.assetDataUtils.isStaticCallAssetData(decodedAssetData)) {
        if (!_.includes(allowedTokens, decodedAssetData.tokenAddress)) {
            throw new errors_1.ValidationError([
                {
                    field,
                    code: errors_1.ValidationErrorCodes.ValueOutOfRange,
                    reason: `${decodedAssetData.tokenAddress} not supported`,
                },
            ]);
        }
    }
}
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
