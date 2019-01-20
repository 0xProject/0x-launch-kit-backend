'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const _0x_js_1 = require('0x.js');
const order_utils_1 = require('@0x/order-utils');
const order_watcher_1 = require('@0x/order-watcher');
const types_1 = require('@0x/types');
const utils_1 = require('@0x/utils');
const _ = require('lodash');
const config_1 = require('./config');
const constants_1 = require('./constants');
const db_connection_1 = require('./db_connection');
const SignedOrderModel_1 = require('./models/SignedOrderModel');
const paginator_1 = require('./paginator');
const utils_2 = require('./utils');
// Mapping from an order hash to the timestamp when it was shadowed
const shadowedOrders = new Map();
exports.orderBook = {
    onOrderStateChangeCallback: (err, orderState) => {
        if (!_.isUndefined(err)) {
            utils_2.utils.log(err);
        } else {
            const state = orderState;
            if (!state.isValid) {
                shadowedOrders.set(state.orderHash, Date.now());
            } else {
                shadowedOrders.delete(state.orderHash);
            }
        }
    },
    onCleanUpInvalidOrdersAsync: async () => {
        const permanentlyExpiredOrders = [];
        for (const [orderHash, shadowedAt] of shadowedOrders) {
            const now = Date.now();
            if (shadowedAt + config_1.ORDER_SHADOWING_MARGIN_MS < now) {
                permanentlyExpiredOrders.push(orderHash);
            }
        }
        if (!_.isEmpty(permanentlyExpiredOrders)) {
            const connection = db_connection_1.getDBConnection();
            await connection.manager.delete(SignedOrderModel_1.SignedOrderModel, permanentlyExpiredOrders);
        }
    },
    addOrderAsync: async signedOrder => {
        await orderWatcher.addOrderAsync(signedOrder);
        const signedOrderModel = serializeOrder(signedOrder);
        const connection = db_connection_1.getDBConnection();
        await connection.manager.save(signedOrderModel);
    },
    getAssetPairsAsync: async (page, perPage, assetDataA, assetDataB) => {
        const connection = db_connection_1.getDBConnection();
        const signedOrderModels = await connection.manager.find(SignedOrderModel_1.SignedOrderModel);
        const erc721AssetDataToAsset = assetData => {
            const asset = {
                minAmount: new _0x_js_1.BigNumber(0),
                maxAmount: new _0x_js_1.BigNumber(1),
                precision: 0,
                assetData,
            };
            return asset;
        };
        const erc20AssetDataToAsset = assetData => {
            const asset = {
                minAmount: new _0x_js_1.BigNumber(0),
                maxAmount: constants_1.MAX_TOKEN_SUPPLY_POSSIBLE,
                precision: config_1.DEFAULT_ERC20_TOKEN_PRECISION,
                assetData,
            };
            return asset;
        };
        const assetDataToAsset = assetData => {
            const assetProxyId = order_utils_1.assetDataUtils.decodeAssetProxyId(assetData);
            let asset;
            switch (assetProxyId) {
                case types_1.AssetProxyId.ERC20:
                    asset = erc20AssetDataToAsset(assetData);
                    break;
                case types_1.AssetProxyId.ERC721:
                    asset = erc721AssetDataToAsset(assetData);
                    break;
                default:
                    throw utils_1.errorUtils.spawnSwitchErr('assetProxyId', assetProxyId);
            }
            return asset;
        };
        const signedOrderToAssetPair = signedOrder => {
            return {
                assetDataA: assetDataToAsset(signedOrder.makerAssetData),
                assetDataB: assetDataToAsset(signedOrder.takerAssetData),
            };
        };
        const assetPairsItems = signedOrderModels.map(deserializeOrder).map(signedOrderToAssetPair);
        let nonPaginatedFilteredAssetPairs;
        if (_.isUndefined(assetDataA) && _.isUndefined(assetDataB)) {
            nonPaginatedFilteredAssetPairs = assetPairsItems;
        } else if (!_.isUndefined(assetDataA) && !_.isUndefined(assetDataB)) {
            const containsAssetDataAAndAssetDataB = assetPair =>
                (assetPair.assetDataA.assetData === assetDataA && assetPair.assetDataB.assetData === assetDataB) ||
                (assetPair.assetDataA.assetData === assetDataB && assetPair.assetDataB.assetData === assetDataA);
            nonPaginatedFilteredAssetPairs = assetPairsItems.filter(containsAssetDataAAndAssetDataB);
        } else {
            const assetData = assetDataA || assetDataB;
            const containsAssetData = assetPair =>
                assetPair.assetDataA.assetData === assetData || assetPair.assetDataB.assetData === assetData;
            nonPaginatedFilteredAssetPairs = assetPairsItems.filter(containsAssetData);
        }
        const uniqueNonPaginatedFilteredAssetPairs = _.uniqWith(nonPaginatedFilteredAssetPairs, _.isEqual.bind(_));
        const paginatedFilteredAssetPairs = paginator_1.paginate(uniqueNonPaginatedFilteredAssetPairs, page, perPage);
        return paginatedFilteredAssetPairs;
    },
    getOrderBookAsync: async (page, perPage, baseAssetData, quoteAssetData) => {
        const connection = db_connection_1.getDBConnection();
        const bidSignedOrderModels = await connection.manager.find(SignedOrderModel_1.SignedOrderModel, {
            where: { takerAssetData: baseAssetData, makerAssetData: quoteAssetData },
        });
        const askSignedOrderModels = await connection.manager.find(SignedOrderModel_1.SignedOrderModel, {
            where: { takerAssetData: quoteAssetData, makerAssetData: baseAssetData },
        });
        const bidApiOrders = bidSignedOrderModels
            .map(deserializeOrder)
            .filter(order => !shadowedOrders.has(_0x_js_1.orderHashUtils.getOrderHashHex(order)))
            .map(signedOrder => ({ metaData: {}, order: signedOrder }));
        const askApiOrders = askSignedOrderModels
            .map(deserializeOrder)
            .filter(order => !shadowedOrders.has(_0x_js_1.orderHashUtils.getOrderHashHex(order)))
            .map(signedOrder => ({ metaData: {}, order: signedOrder }));
        const paginatedBidApiOrders = paginator_1.paginate(bidApiOrders, page, perPage);
        const paginatedAskApiOrders = paginator_1.paginate(askApiOrders, page, perPage);
        return {
            bids: paginatedBidApiOrders,
            asks: paginatedAskApiOrders,
        };
    },
    // TODO:(leo) Do all filtering and pagination in a DB (requires stored procedures or redundant fields)
    getOrdersAsync: async (page, perPage, ordersFilterParams) => {
        const connection = db_connection_1.getDBConnection();
        // Pre-filters
        const filterObjectWithValuesIfExist = {
            exchangeAddress: ordersFilterParams.exchangeAddress,
            senderAddress: ordersFilterParams.senderAddress,
            makerAssetData: ordersFilterParams.makerAssetData,
            takerAssetData: ordersFilterParams.takerAssetData,
            makerAddress: ordersFilterParams.makerAddress,
            takerAddress: ordersFilterParams.takerAddress,
            feeRecipientAddress: ordersFilterParams.feeRecipientAddress,
        };
        const filterObject = _.pickBy(filterObjectWithValuesIfExist, _.identity.bind(_));
        const signedOrderModels = await connection.manager.find(SignedOrderModel_1.SignedOrderModel, {
            where: filterObject,
        });
        let signedOrders = _.map(signedOrderModels, deserializeOrder);
        // Post-filters
        signedOrders = signedOrders
            .filter(order => !shadowedOrders.has(_0x_js_1.orderHashUtils.getOrderHashHex(order)))
            .filter(
                // traderAddress
                signedOrder =>
                    _.isUndefined(ordersFilterParams.traderAddress) ||
                    signedOrder.makerAddress === ordersFilterParams.traderAddress ||
                    signedOrder.takerAddress === ordersFilterParams.traderAddress,
            )
            .filter(
                // makerAssetAddress
                signedOrder =>
                    _.isUndefined(ordersFilterParams.makerAssetAddress) ||
                    order_utils_1.assetDataUtils.decodeAssetDataOrThrow(signedOrder.makerAssetData).tokenAddress ===
                        ordersFilterParams.makerAssetAddress,
            )
            .filter(
                // takerAssetAddress
                signedOrder =>
                    _.isUndefined(ordersFilterParams.takerAssetAddress) ||
                    order_utils_1.assetDataUtils.decodeAssetDataOrThrow(signedOrder.takerAssetData).tokenAddress ===
                        ordersFilterParams.takerAssetAddress,
            )
            .filter(
                // makerAssetProxyId
                signedOrder =>
                    _.isUndefined(ordersFilterParams.makerAssetProxyId) ||
                    order_utils_1.assetDataUtils.decodeAssetDataOrThrow(signedOrder.makerAssetData).assetProxyId ===
                        ordersFilterParams.makerAssetProxyId,
            )
            .filter(
                // makerAssetProxyId
                signedOrder =>
                    _.isUndefined(ordersFilterParams.takerAssetProxyId) ||
                    order_utils_1.assetDataUtils.decodeAssetDataOrThrow(signedOrder.takerAssetData).assetProxyId ===
                        ordersFilterParams.takerAssetProxyId,
            );
        const apiOrders = signedOrders.map(signedOrder => ({ metaData: {}, order: signedOrder }));
        const paginatedApiOrders = paginator_1.paginate(apiOrders, page, perPage);
        return paginatedApiOrders;
    },
    getOrderByHashIfExistsAsync: async orderHash => {
        const connection = db_connection_1.getDBConnection();
        const signedOrderModelIfExists = await connection.manager.findOne(
            SignedOrderModel_1.SignedOrderModel,
            orderHash,
        );
        if (_.isUndefined(signedOrderModelIfExists)) {
            return undefined;
        } else {
            const deserializedOrder = deserializeOrder(signedOrderModelIfExists);
            return { metaData: {}, order: deserializedOrder };
        }
    },
};
const deserializeOrder = signedOrderModel => {
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
const serializeOrder = signedOrder => {
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
const provider = new _0x_js_1.Web3ProviderEngine();
provider.addProvider(new _0x_js_1.RPCSubprovider(config_1.RPC_URL));
provider.start();
const orderWatcher = new order_watcher_1.OrderWatcher(provider, config_1.NETWORK_ID);
orderWatcher.subscribe(exports.orderBook.onOrderStateChangeCallback);
utils_1.intervalUtils.setAsyncExcludingInterval(
    exports.orderBook.onCleanUpInvalidOrdersAsync.bind(exports.orderBook),
    config_1.PERMANENT_CLEANUP_INTERVAL_MS,
    utils_2.utils.log,
);
