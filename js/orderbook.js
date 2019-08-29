'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const _0x_js_1 = require('0x.js');
const types_1 = require('@0x/types');
const utils_1 = require('@0x/utils');
const _ = require('lodash');
const config_1 = require('./config');
const config_2 = require('./config');
const constants_1 = require('./constants');
const db_connection_1 = require('./db_connection');
const SignedOrderModel_1 = require('./models/SignedOrderModel');
const order_watchers_factory_1 = require('./order_watchers/order_watchers_factory');
const paginator_1 = require('./paginator');
const types_2 = require('./types');
// tslint:disable-next-line:no-var-requires
const d = require('debug')('orderbook');
const DEFAULT_ERC721_ASSET = {
    minAmount: new _0x_js_1.BigNumber(0),
    maxAmount: new _0x_js_1.BigNumber(1),
    precision: 0,
};
const DEFAULT_ERC20_ASSET = {
    minAmount: new _0x_js_1.BigNumber(0),
    maxAmount: constants_1.MAX_TOKEN_SUPPLY_POSSIBLE,
    precision: config_1.DEFAULT_ERC20_TOKEN_PRECISION,
};
class OrderBook {
    static async getOrderByHashIfExistsAsync(orderHash) {
        const connection = db_connection_1.getDBConnection();
        const signedOrderModelIfExists = await connection.manager.findOne(
            SignedOrderModel_1.SignedOrderModel,
            orderHash,
        );
        if (signedOrderModelIfExists === undefined) {
            return undefined;
        } else {
            const deserializedOrder = deserializeOrderToAPIOrder(signedOrderModelIfExists);
            return deserializedOrder;
        }
    }
    static async getAssetPairsAsync(page, perPage, assetDataA, assetDataB) {
        const connection = db_connection_1.getDBConnection();
        const signedOrderModels = await connection.manager.find(SignedOrderModel_1.SignedOrderModel);
        const assetPairsItems = signedOrderModels.map(deserializeOrder).map(signedOrderToAssetPair);
        let nonPaginatedFilteredAssetPairs;
        if (assetDataA === undefined && assetDataB === undefined) {
            nonPaginatedFilteredAssetPairs = assetPairsItems;
        } else if (assetDataA !== undefined && assetDataB !== undefined) {
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
    }
    constructor(websocketSRA) {
        this._websocketSRA = websocketSRA;
        if (!config_2.READ_ONLY) {
            this._orderWatcher = order_watchers_factory_1.OrderWatchersFactory.build();
            this._orderWatcher.onOrdersAdded(async orders => {
                await this._onOrderLifeCycleEventAsync(types_2.OrderWatcherLifeCycleEvents.Added, orders);
            });
            this._orderWatcher.onOrdersRemoved(async orders => {
                await this._onOrderLifeCycleEventAsync(types_2.OrderWatcherLifeCycleEvents.Removed, orders);
            });
            this._orderWatcher.onOrdersUpdated(async orders => {
                await this._onOrderLifeCycleEventAsync(types_2.OrderWatcherLifeCycleEvents.Updated, orders);
            });
            this._orderWatcher.onReconnected(async () => {
                d('Reconnecting to orderwatcher');
                await this.addExistingOrdersToOrderWatcherAsync();
            });
        }
    }
    async addOrderAsync(signedOrder) {
        if (config_2.READ_ONLY || !this._orderWatcher) {
            return;
        }
        const { rejected } = await this._orderWatcher.addOrdersAsync([signedOrder]);
        if (rejected.length !== 0) {
            throw new Error(rejected[0].message);
        }
        // Mesh/OrderWatcher will call back when the order is added
    }
    // tslint:disable-next-line:prefer-function-over-method
    async getOrderBookAsync(page, perPage, baseAssetData, quoteAssetData) {
        const connection = db_connection_1.getDBConnection();
        const bidSignedOrderModels = await connection.manager.find(SignedOrderModel_1.SignedOrderModel, {
            where: { takerAssetData: baseAssetData, makerAssetData: quoteAssetData },
        });
        const askSignedOrderModels = await connection.manager.find(SignedOrderModel_1.SignedOrderModel, {
            where: { takerAssetData: quoteAssetData, makerAssetData: baseAssetData },
        });
        const bidApiOrders = bidSignedOrderModels
            .map(deserializeOrderToAPIOrder)
            .sort((orderA, orderB) => compareBidOrder(orderA.order, orderB.order));
        const askApiOrders = askSignedOrderModels
            .map(deserializeOrderToAPIOrder)
            .sort((orderA, orderB) => compareAskOrder(orderA.order, orderB.order));
        const paginatedBidApiOrders = paginator_1.paginate(bidApiOrders, page, perPage);
        const paginatedAskApiOrders = paginator_1.paginate(askApiOrders, page, perPage);
        return {
            bids: paginatedBidApiOrders,
            asks: paginatedAskApiOrders,
        };
    }
    // TODO:(leo) Do all filtering and pagination in a DB (requires stored procedures or redundant fields)
    // tslint:disable-next-line:prefer-function-over-method
    async getOrdersAsync(page, perPage, ordersFilterParams) {
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
        let apiOrders = _.map(signedOrderModels, deserializeOrderToAPIOrder);
        // Post-filters
        apiOrders = apiOrders
            .filter(
                // traderAddress
                apiOrder =>
                    ordersFilterParams.traderAddress === undefined ||
                    apiOrder.order.makerAddress === ordersFilterParams.traderAddress ||
                    apiOrder.order.takerAddress === ordersFilterParams.traderAddress,
            )
            .filter(
                // makerAssetAddress
                apiOrder =>
                    ordersFilterParams.makerAssetAddress === undefined ||
                    includesTokenAddress(apiOrder.order.makerAssetData, ordersFilterParams.makerAssetAddress),
            )
            .filter(
                // takerAssetAddress
                apiOrder =>
                    ordersFilterParams.takerAssetAddress === undefined ||
                    includesTokenAddress(apiOrder.order.takerAssetData, ordersFilterParams.takerAssetAddress),
            )
            .filter(
                // makerAssetProxyId
                apiOrder =>
                    ordersFilterParams.makerAssetProxyId === undefined ||
                    _0x_js_1.assetDataUtils.decodeAssetDataOrThrow(apiOrder.order.makerAssetData).assetProxyId ===
                        ordersFilterParams.makerAssetProxyId,
            )
            .filter(
                // takerAssetProxyId
                apiOrder =>
                    ordersFilterParams.takerAssetProxyId === undefined ||
                    _0x_js_1.assetDataUtils.decodeAssetDataOrThrow(apiOrder.order.takerAssetData).assetProxyId ===
                        ordersFilterParams.takerAssetProxyId,
            );
        const paginatedApiOrders = paginator_1.paginate(apiOrders, page, perPage);
        return paginatedApiOrders;
    }
    async addExistingOrdersToOrderWatcherAsync() {
        if (config_2.READ_ONLY || !this._orderWatcher) {
            return;
        }
        const connection = db_connection_1.getDBConnection();
        const signedOrderModels = await connection.manager.find(SignedOrderModel_1.SignedOrderModel);
        const signedOrders = signedOrderModels.map(deserializeOrder);
        d('SEND', signedOrders.length);
        // Sync the order watching service state locally
        const getOrdersPromise = this._orderWatcher.getOrdersAsync();
        // Validate the local state and notify the order watcher of any missed orders
        const { accepted, rejected } = await this._orderWatcher.addOrdersAsync(signedOrders);
        d(
            `RESULT ${rejected.length} rejected ${accepted.length} accepted. ${rejected.length +
                accepted.length} total, ${signedOrders.length} sent`,
        );
        // Remove all of the rejected orders
        if (rejected.length > 0) {
            await this._onOrderLifeCycleEventAsync(types_2.OrderWatcherLifeCycleEvents.Removed, rejected);
        }
        // Sync the order watching service state locally
        const orders = await getOrdersPromise;
        if (orders.length > 0) {
            await this._onOrderLifeCycleEventAsync(types_2.OrderWatcherLifeCycleEvents.Added, orders);
        }
    }
    async _onOrderLifeCycleEventAsync(lifecycleEvent, orders) {
        const connection = db_connection_1.getDBConnection();
        switch (lifecycleEvent) {
            case types_2.OrderWatcherLifeCycleEvents.Updated:
            case types_2.OrderWatcherLifeCycleEvents.Added: {
                const signedOrdersModel = orders.map(o => serializeOrder(o));
                await connection.manager.save(signedOrdersModel);
                break;
            }
            case types_2.OrderWatcherLifeCycleEvents.Removed: {
                const orderHashes = orders.map(o => o.metaData.orderHash);
                await connection.manager.delete(SignedOrderModel_1.SignedOrderModel, orderHashes);
                break;
            }
            default:
            // Do Nothing
        }
        this._websocketSRA.orderUpdate(orders);
    }
}
exports.OrderBook = OrderBook;
const compareAskOrder = (orderA, orderB) => {
    const orderAPrice = orderA.takerAssetAmount.div(orderA.makerAssetAmount);
    const orderBPrice = orderB.takerAssetAmount.div(orderB.makerAssetAmount);
    if (!orderAPrice.isEqualTo(orderBPrice)) {
        return orderAPrice.comparedTo(orderBPrice);
    }
    return compareOrderByFeeRatio(orderA, orderB);
};
const compareBidOrder = (orderA, orderB) => {
    const orderAPrice = orderA.makerAssetAmount.div(orderA.takerAssetAmount);
    const orderBPrice = orderB.makerAssetAmount.div(orderB.takerAssetAmount);
    if (!orderAPrice.isEqualTo(orderBPrice)) {
        return orderBPrice.comparedTo(orderAPrice);
    }
    return compareOrderByFeeRatio(orderA, orderB);
};
const compareOrderByFeeRatio = (orderA, orderB) => {
    const orderAFeePrice = orderA.takerFee.div(orderA.takerAssetAmount);
    const orderBFeePrice = orderB.takerFee.div(orderB.takerAssetAmount);
    if (!orderAFeePrice.isEqualTo(orderBFeePrice)) {
        return orderBFeePrice.comparedTo(orderAFeePrice);
    }
    return orderA.expirationTimeSeconds.comparedTo(orderB.expirationTimeSeconds);
};
const includesTokenAddress = (assetData, tokenAddress) => {
    const decodedAssetData = _0x_js_1.assetDataUtils.decodeAssetDataOrThrow(assetData);
    if (_0x_js_1.assetDataUtils.isMultiAssetData(decodedAssetData)) {
        for (const [, nestedAssetDataElement] of decodedAssetData.nestedAssetData.entries()) {
            if (includesTokenAddress(nestedAssetDataElement, tokenAddress)) {
                return true;
            }
        }
        return false;
    } else if (!_0x_js_1.assetDataUtils.isStaticCallAssetData(decodedAssetData)) {
        return decodedAssetData.tokenAddress === tokenAddress;
    }
    return false;
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
const deserializeOrderToAPIOrder = signedOrderModel => {
    const order = deserializeOrder(signedOrderModel);
    const apiOrder = {
        order,
        metaData: {
            orderHash: signedOrderModel.hash,
            remainingFillableTakerAssetAmount: signedOrderModel.remainingFillableTakerAssetAmount,
        },
    };
    return apiOrder;
};
const serializeOrder = apiOrder => {
    const signedOrder = apiOrder.order;
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
        hash: apiOrder.metaData.orderHash,
        remainingFillableTakerAssetAmount: apiOrder.metaData.remainingFillableTakerAssetAmount.toString(),
    });
    return signedOrderModel;
};
const erc721AssetDataToAsset = assetData => ({
    ...DEFAULT_ERC721_ASSET,
    assetData,
});
const erc20AssetDataToAsset = assetData => ({
    ...DEFAULT_ERC20_ASSET,
    assetData,
});
const assetDataToAsset = assetData => {
    const assetProxyId = _0x_js_1.assetDataUtils.decodeAssetProxyId(assetData);
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
