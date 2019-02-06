"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _0x_js_1 = require("0x.js");
const order_watcher_1 = require("@0x/order-watcher");
const types_1 = require("@0x/types");
const utils_1 = require("@0x/utils");
const _ = require("lodash");
const config_1 = require("./config");
const constants_1 = require("./constants");
const db_connection_1 = require("./db_connection");
const SignedOrderModel_1 = require("./models/SignedOrderModel");
const paginator_1 = require("./paginator");
const utils_2 = require("./utils");
class OrderBook {
    static async getOrderByHashIfExistsAsync(orderHash) {
        const connection = db_connection_1.getDBConnection();
        const signedOrderModelIfExists = await connection.manager.findOne(SignedOrderModel_1.SignedOrderModel, orderHash);
        if (_.isUndefined(signedOrderModelIfExists)) {
            return undefined;
        }
        else {
            const deserializedOrder = deserializeOrder(signedOrderModelIfExists);
            return { metaData: {}, order: deserializedOrder };
        }
    }
    static async getAssetPairsAsync(page, perPage, assetDataA, assetDataB) {
        const connection = db_connection_1.getDBConnection();
        const signedOrderModels = (await connection.manager.find(SignedOrderModel_1.SignedOrderModel));
        const erc721AssetDataToAsset = (assetData) => {
            const asset = {
                minAmount: new _0x_js_1.BigNumber(0),
                maxAmount: new _0x_js_1.BigNumber(1),
                precision: 0,
                assetData,
            };
            return asset;
        };
        const erc20AssetDataToAsset = (assetData) => {
            const asset = {
                minAmount: new _0x_js_1.BigNumber(0),
                maxAmount: constants_1.MAX_TOKEN_SUPPLY_POSSIBLE,
                precision: config_1.DEFAULT_ERC20_TOKEN_PRECISION,
                assetData,
            };
            return asset;
        };
        const assetDataToAsset = (assetData) => {
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
        const signedOrderToAssetPair = (signedOrder) => {
            return {
                assetDataA: assetDataToAsset(signedOrder.makerAssetData),
                assetDataB: assetDataToAsset(signedOrder.takerAssetData),
            };
        };
        const assetPairsItems = signedOrderModels.map(deserializeOrder).map(signedOrderToAssetPair);
        let nonPaginatedFilteredAssetPairs;
        if (_.isUndefined(assetDataA) && _.isUndefined(assetDataB)) {
            nonPaginatedFilteredAssetPairs = assetPairsItems;
        }
        else if (!_.isUndefined(assetDataA) && !_.isUndefined(assetDataB)) {
            const containsAssetDataAAndAssetDataB = (assetPair) => (assetPair.assetDataA.assetData === assetDataA && assetPair.assetDataB.assetData === assetDataB) ||
                (assetPair.assetDataA.assetData === assetDataB && assetPair.assetDataB.assetData === assetDataA);
            nonPaginatedFilteredAssetPairs = assetPairsItems.filter(containsAssetDataAAndAssetDataB);
        }
        else {
            const assetData = assetDataA || assetDataB;
            const containsAssetData = (assetPair) => assetPair.assetDataA.assetData === assetData || assetPair.assetDataB.assetData === assetData;
            nonPaginatedFilteredAssetPairs = assetPairsItems.filter(containsAssetData);
        }
        const uniqueNonPaginatedFilteredAssetPairs = _.uniqWith(nonPaginatedFilteredAssetPairs, _.isEqual.bind(_));
        const paginatedFilteredAssetPairs = paginator_1.paginate(uniqueNonPaginatedFilteredAssetPairs, page, perPage);
        return paginatedFilteredAssetPairs;
    }
    constructor() {
        const provider = new _0x_js_1.Web3ProviderEngine();
        provider.addProvider(new _0x_js_1.RPCSubprovider(config_1.RPC_URL));
        provider.start();
        this._shadowedOrders = new Map();
        this._contractWrappers = new _0x_js_1.ContractWrappers(provider, {
            networkId: config_1.NETWORK_ID,
        });
        this._orderWatcher = new order_watcher_1.OrderWatcher(provider, config_1.NETWORK_ID);
        this._orderWatcher.subscribe(this.onOrderStateChangeCallback.bind(this));
        utils_1.intervalUtils.setAsyncExcludingInterval(this.onCleanUpInvalidOrdersAsync.bind(this), config_1.PERMANENT_CLEANUP_INTERVAL_MS, utils_2.utils.log);
    }
    onOrderStateChangeCallback(err, orderState) {
        if (!_.isNull(err)) {
            utils_2.utils.log(err);
        }
        else {
            const state = orderState;
            if (!state.isValid) {
                this._shadowedOrders.set(state.orderHash, Date.now());
            }
            else {
                this._shadowedOrders.delete(state.orderHash);
            }
        }
    }
    async onCleanUpInvalidOrdersAsync() {
        const permanentlyExpiredOrders = [];
        for (const [orderHash, shadowedAt] of this._shadowedOrders) {
            const now = Date.now();
            if (shadowedAt + config_1.ORDER_SHADOWING_MARGIN_MS < now) {
                permanentlyExpiredOrders.push(orderHash);
                this._shadowedOrders.delete(orderHash); // we need to remove this order so we don't keep shadowing it
                this._orderWatcher.removeOrder(orderHash); // also remove from order watcher to avoid more callbacks
            }
        }
        if (!_.isEmpty(permanentlyExpiredOrders)) {
            const connection = db_connection_1.getDBConnection();
            await connection.manager.delete(SignedOrderModel_1.SignedOrderModel, permanentlyExpiredOrders);
        }
    }
    async addOrderAsync(signedOrder) {
        const connection = db_connection_1.getDBConnection();
        await this._contractWrappers.exchange.validateOrderFillableOrThrowAsync(signedOrder);
        await this._orderWatcher.addOrderAsync(signedOrder);
        const signedOrderModel = serializeOrder(signedOrder);
        await connection.manager.save(signedOrderModel);
    }
    async getOrderBookAsync(page, perPage, baseAssetData, quoteAssetData) {
        const connection = db_connection_1.getDBConnection();
        const bidSignedOrderModels = (await connection.manager.find(SignedOrderModel_1.SignedOrderModel, {
            where: { takerAssetData: baseAssetData, makerAssetData: quoteAssetData },
        }));
        const askSignedOrderModels = (await connection.manager.find(SignedOrderModel_1.SignedOrderModel, {
            where: { takerAssetData: quoteAssetData, makerAssetData: baseAssetData },
        }));
        const bidApiOrders = bidSignedOrderModels
            .map(deserializeOrder)
            .filter(order => !this._shadowedOrders.has(_0x_js_1.orderHashUtils.getOrderHashHex(order)))
            .map(signedOrder => ({ metaData: {}, order: signedOrder }));
        const askApiOrders = askSignedOrderModels
            .map(deserializeOrder)
            .filter(order => !this._shadowedOrders.has(_0x_js_1.orderHashUtils.getOrderHashHex(order)))
            .map(signedOrder => ({ metaData: {}, order: signedOrder }));
        const paginatedBidApiOrders = paginator_1.paginate(bidApiOrders, page, perPage);
        const paginatedAskApiOrders = paginator_1.paginate(askApiOrders, page, perPage);
        return {
            bids: paginatedBidApiOrders,
            asks: paginatedAskApiOrders,
        };
    }
    // TODO:(leo) Do all filtering and pagination in a DB (requires stored procedures or redundant fields)
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
        const signedOrderModels = (await connection.manager.find(SignedOrderModel_1.SignedOrderModel, { where: filterObject }));
        let signedOrders = _.map(signedOrderModels, deserializeOrder);
        // Post-filters
        signedOrders = signedOrders
            .filter(order => !this._shadowedOrders.has(_0x_js_1.orderHashUtils.getOrderHashHex(order)))
            .filter(
        // traderAddress
        signedOrder => _.isUndefined(ordersFilterParams.traderAddress) ||
            signedOrder.makerAddress === ordersFilterParams.traderAddress ||
            signedOrder.takerAddress === ordersFilterParams.traderAddress)
            .filter(
        // makerAssetAddress
        signedOrder => _.isUndefined(ordersFilterParams.makerAssetAddress) ||
            includesTokenAddress(signedOrder.makerAssetData, ordersFilterParams.makerAssetAddress))
            .filter(
        // takerAssetAddress
        signedOrder => _.isUndefined(ordersFilterParams.takerAssetAddress) ||
            includesTokenAddress(signedOrder.takerAssetData, ordersFilterParams.takerAssetAddress))
            .filter(
        // makerAssetProxyId
        signedOrder => _.isUndefined(ordersFilterParams.makerAssetProxyId) ||
            _0x_js_1.assetDataUtils.decodeAssetDataOrThrow(signedOrder.makerAssetData).assetProxyId ===
                ordersFilterParams.makerAssetProxyId)
            .filter(
        // makerAssetProxyId
        signedOrder => _.isUndefined(ordersFilterParams.takerAssetProxyId) ||
            _0x_js_1.assetDataUtils.decodeAssetDataOrThrow(signedOrder.takerAssetData).assetProxyId ===
                ordersFilterParams.takerAssetProxyId);
        const apiOrders = signedOrders.map(signedOrder => ({ metaData: {}, order: signedOrder }));
        const paginatedApiOrders = paginator_1.paginate(apiOrders, page, perPage);
        return paginatedApiOrders;
    }
    async addExistingOrdersToOrderWatcherAsync() {
        const connection = db_connection_1.getDBConnection();
        const signedOrderModels = (await connection.manager.find(SignedOrderModel_1.SignedOrderModel));
        const signedOrders = signedOrderModels.map(deserializeOrder);
        for (const signedOrder of signedOrders) {
            try {
                await this._contractWrappers.exchange.validateOrderFillableOrThrowAsync(signedOrder);
                await this._orderWatcher.addOrderAsync(signedOrder);
            }
            catch (err) {
                const orderHash = _0x_js_1.orderHashUtils.getOrderHashHex(signedOrder);
                await connection.manager.delete(SignedOrderModel_1.SignedOrderModel, orderHash);
            }
        }
    }
}
exports.OrderBook = OrderBook;
const includesTokenAddress = (assetData, tokenAddress) => {
    const decodedAssetData = _0x_js_1.assetDataUtils.decodeAssetDataOrThrow(assetData);
    if (_0x_js_1.assetDataUtils.isMultiAssetData(decodedAssetData)) {
        for (const [, nestedAssetDataElement] of decodedAssetData.nestedAssetData.entries()) {
            if (includesTokenAddress(nestedAssetDataElement, tokenAddress)) {
                return true;
            }
        }
        return false;
    }
    else {
        return decodedAssetData.tokenAddress === tokenAddress;
    }
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
