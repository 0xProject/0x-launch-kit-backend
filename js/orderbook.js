"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _0x_js_1 = require("0x.js");
const _ = require("lodash");
const db_connection_1 = require("./db_connection");
const SignedOrderModel_1 = require("./models/SignedOrderModel");
const paginator_1 = require("./paginator");
exports.orderBook = {
    addOrderAsync: async (signedOrder) => {
        const signedOrderModel = serializeOrder(signedOrder);
        const connection = db_connection_1.getDBConnection();
        await connection.manager.save(signedOrderModel);
    },
    getOrderBookAsync: async (baseAssetData, quoteAssetData) => {
        const connection = db_connection_1.getDBConnection();
        const bidSignedOrderModels = (await connection.manager.find(SignedOrderModel_1.SignedOrderModel, {
            where: { takerAssetData: baseAssetData, makerAssetData: quoteAssetData },
        }));
        const askSignedOrderModels = (await connection.manager.find(SignedOrderModel_1.SignedOrderModel, {
            where: { takerAssetData: quoteAssetData, makerAssetData: baseAssetData },
        }));
        const bidApiOrders = bidSignedOrderModels
            .map(deserializeOrder)
            .map(signedOrder => ({ metaData: {}, order: signedOrder }));
        const askApiOrders = askSignedOrderModels
            .map(deserializeOrder)
            .map(signedOrder => ({ metaData: {}, order: signedOrder }));
        return {
            bids: paginator_1.paginate(bidApiOrders),
            asks: paginator_1.paginate(askApiOrders),
        };
    },
    getOrdersAsync: async () => {
        const connection = db_connection_1.getDBConnection();
        const signedOrderModels = (await connection.manager.find(SignedOrderModel_1.SignedOrderModel));
        const signedOrders = _.map(signedOrderModels, deserializeOrder);
        const apiOrders = signedOrders.map(signedOrder => ({ metaData: {}, order: signedOrder }));
        return apiOrders;
    },
    getOrderByHashIfExistsAsync: async (orderHash) => {
        const connection = db_connection_1.getDBConnection();
        const signedOrderModelIfExists = await connection.manager.findOne(SignedOrderModel_1.SignedOrderModel, orderHash);
        if (_.isUndefined(signedOrderModelIfExists)) {
            return undefined;
        }
        else {
            return deserializeOrder(signedOrderModelIfExists);
        }
    },
};
const deserializeOrder = (signedOrderModel) => {
    const signedOrder = {
        signature: signedOrderModel.signature,
        senderAddress: signedOrderModel.senderAddress,
        makerAddress: signedOrderModel.makerAddress,
        takerAddress: signedOrderModel.takerAddress,
        makerFee: new _0x_js_1.BigNumber(signedOrderModel.makerFee),
        takerFee: new _0x_js_1.BigNumber(signedOrderModel.takerFee),
        makerAssetAmount: new _0x_js_1.BigNumber(signedOrderModel.makerAssetAmount),
        takerAssetAmount: new _0x_js_1.BigNumber(signedOrderModel.takerAssetAmount),
        makerAssetData: signedOrderModel.makerAssetData,
        takerAssetData: signedOrderModel.takerAssetData,
        salt: new _0x_js_1.BigNumber(signedOrderModel.salt),
        exchangeAddress: signedOrderModel.exchangeAddress,
        feeRecipientAddress: signedOrderModel.feeRecipientAddress,
        expirationTimeSeconds: new _0x_js_1.BigNumber(signedOrderModel.expirationTimeSeconds),
    };
    return signedOrder;
};
const serializeOrder = (signedOrder) => {
    const signedOrderModel = new SignedOrderModel_1.SignedOrderModel({
        signature: signedOrder.signature,
        senderAddress: signedOrder.senderAddress,
        makerAddress: signedOrder.makerAddress,
        takerAddress: signedOrder.takerAddress,
        makerFee: signedOrder.makerFee.toString(),
        takerFee: signedOrder.takerFee.toString(),
        makerAssetAmount: signedOrder.makerAssetAmount.toString(),
        takerAssetAmount: signedOrder.takerAssetAmount.toString(),
        makerAssetData: signedOrder.makerAssetData,
        takerAssetData: signedOrder.takerAssetData,
        salt: signedOrder.salt.toString(),
        exchangeAddress: signedOrder.exchangeAddress,
        feeRecipientAddress: signedOrder.feeRecipientAddress,
        expirationTimeSeconds: signedOrder.expirationTimeSeconds.toNumber(),
        hash: _0x_js_1.orderHashUtils.getOrderHashHex(signedOrder),
    });
    return signedOrderModel;
};
