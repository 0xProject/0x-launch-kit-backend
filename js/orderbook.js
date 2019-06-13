"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _0x_js_1 = require("0x.js");
const order_utils_1 = require("@0x/order-utils");
const types_1 = require("@0x/types");
const utils_1 = require("@0x/utils");
const _ = require("lodash");
const Web3Providers = require("web3-providers");
const config_1 = require("./config");
const constants_1 = require("./constants");
const db_connection_1 = require("./db_connection");
const SignedOrderModel_1 = require("./models/SignedOrderModel");
const paginator_1 = require("./paginator");
const types_2 = require("./types");
const MESH_WS_PORT = 60557;
const MESH_WS_ENDPOINT = `ws://localhost:${MESH_WS_PORT}`;
const BATCH_SIZE = 1000;
class OrderBook {
    static async getOrderByHashIfExistsAsync(orderHash) {
        const connection = db_connection_1.getDBConnection();
        const signedOrderModelIfExists = await connection.manager.findOne(SignedOrderModel_1.SignedOrderModel, orderHash);
        if (signedOrderModelIfExists === undefined) {
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
        if (assetDataA === undefined && assetDataB === undefined) {
            nonPaginatedFilteredAssetPairs = assetPairsItems;
        }
        else if (assetDataA !== undefined && assetDataB !== undefined) {
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
    // TODO:(leo) Do all filtering and pagination in a DB (requires stored procedures or redundant fields)
    static async getOrdersAsync(page, perPage, ordersFilterParams) {
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
            .filter(
        // traderAddress
        signedOrder => ordersFilterParams.traderAddress === undefined ||
            signedOrder.makerAddress === ordersFilterParams.traderAddress ||
            signedOrder.takerAddress === ordersFilterParams.traderAddress)
            .filter(
        // makerAssetAddress
        signedOrder => ordersFilterParams.makerAssetAddress === undefined ||
            includesTokenAddress(signedOrder.makerAssetData, ordersFilterParams.makerAssetAddress))
            .filter(
        // takerAssetAddress
        signedOrder => ordersFilterParams.takerAssetAddress === undefined ||
            includesTokenAddress(signedOrder.takerAssetData, ordersFilterParams.takerAssetAddress))
            .filter(
        // makerAssetProxyId
        signedOrder => ordersFilterParams.makerAssetProxyId === undefined ||
            _0x_js_1.assetDataUtils.decodeAssetDataOrThrow(signedOrder.makerAssetData).assetProxyId ===
                ordersFilterParams.makerAssetProxyId)
            .filter(
        // makerAssetProxyId
        signedOrder => ordersFilterParams.takerAssetProxyId === undefined ||
            _0x_js_1.assetDataUtils.decodeAssetDataOrThrow(signedOrder.takerAssetData).assetProxyId ===
                ordersFilterParams.takerAssetProxyId);
        const apiOrders = signedOrders.map(signedOrder => ({ metaData: {}, order: signedOrder }));
        const paginatedApiOrders = paginator_1.paginate(apiOrders, page, perPage);
        return paginatedApiOrders;
    }
    static async getOrderBookAsync(page, perPage, baseAssetData, quoteAssetData) {
        const connection = db_connection_1.getDBConnection();
        const bidSignedOrderModels = (await connection.manager.find(SignedOrderModel_1.SignedOrderModel, {
            where: { takerAssetData: baseAssetData, makerAssetData: quoteAssetData },
        }));
        const askSignedOrderModels = (await connection.manager.find(SignedOrderModel_1.SignedOrderModel, {
            where: { takerAssetData: quoteAssetData, makerAssetData: baseAssetData },
        }));
        const bidApiOrders = bidSignedOrderModels
            .map(deserializeOrder)
            .sort((orderA, orderB) => compareBidOrder(orderA, orderB))
            .map(signedOrder => ({ metaData: {}, order: signedOrder }));
        const askApiOrders = askSignedOrderModels
            .map(deserializeOrder)
            .sort((orderA, orderB) => compareAskOrder(orderA, orderB))
            .map(signedOrder => ({ metaData: {}, order: signedOrder }));
        const paginatedBidApiOrders = paginator_1.paginate(bidApiOrders, page, perPage);
        const paginatedAskApiOrders = paginator_1.paginate(askApiOrders, page, perPage);
        return {
            bids: paginatedBidApiOrders,
            asks: paginatedAskApiOrders,
        };
    }
    static async _onOrderEventCallbackAsync(events) {
        const connection = db_connection_1.getDBConnection();
        for (const event of events) {
            const signedOrder = order_utils_1.orderParsingUtils.convertOrderStringFieldsToBigNumber(event.signedOrder);
            switch (event.kind) {
                case types_2.OrderEventKind.Added: {
                    const signedOrderModel = serializeOrder(signedOrder);
                    await connection.manager.save(signedOrderModel);
                    break;
                }
                case types_2.OrderEventKind.Cancelled:
                case types_2.OrderEventKind.Expired:
                case types_2.OrderEventKind.FullyFilled:
                case types_2.OrderEventKind.Unfunded: {
                    await connection.manager.delete(SignedOrderModel_1.SignedOrderModel, event.orderHash);
                    break;
                }
                case types_2.OrderEventKind.Filled: {
                    // TODO(fabio): Once we store remaining fillable amount, update DB
                    break;
                }
                case types_2.OrderEventKind.FillabilityIncreased: {
                    // Check if in DB, if not, re-add it
                    const signedOrderModels = await connection.manager.findOne(SignedOrderModel_1.SignedOrderModel, event.orderHash);
                    if (signedOrderModels === undefined) {
                        const signedOrderModel = serializeOrder(signedOrder);
                        await connection.manager.save(signedOrderModel);
                    }
                    break;
                }
                default:
                // noop
            }
        }
    }
    constructor() {
        const provider = new _0x_js_1.Web3ProviderEngine();
        provider.addProvider(new _0x_js_1.RPCSubprovider(config_1.RPC_URL));
        provider.start();
        this._wsClient = new Web3Providers.WebsocketProvider(MESH_WS_ENDPOINT);
        const subscriptionId = this._wsClient.subscribe('mesh_subscribe', 'orders', []);
        this._wsClient.on(subscriptionId, OrderBook._onOrderEventCallbackAsync.bind(this));
    }
    async addOrderAsync(signedOrder) {
        const connection = db_connection_1.getDBConnection();
        const validationResults = await this._submitOrdersToMeshAsync([signedOrder]);
        if (validationResults.rejected !== null) {
            const rejection = validationResults.rejected[0];
            throw new Error(rejection.status.code);
        }
        else {
            // TODO(fabio): Store the `fillableTakerAssetAmount`?
            const signedOrderModel = serializeOrder(signedOrder);
            await connection.manager.save(signedOrderModel);
        }
    }
    async addExistingOrdersToOrderWatcherAsync() {
        const connection = db_connection_1.getDBConnection();
        const signedOrderModels = (await connection.manager.find(SignedOrderModel_1.SignedOrderModel));
        const signedOrders = signedOrderModels.map(deserializeOrder);
        let numBatches = Math.floor(signedOrders.length / BATCH_SIZE);
        numBatches = numBatches === 0 && signedOrders.length > 0 ? 1 : numBatches;
        for (let i = 0; i < numBatches; i++) {
            const batch = signedOrders.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE + 1);
            const validationResults = await this._submitOrdersToMeshAsync(batch);
            // TODO(fabio): Once we store fillable amounts in DB, update them for all accepted orders
            for (const rejectedOrderInfo of validationResults.rejected) {
                switch (rejectedOrderInfo.status.code) {
                    case types_2.RejectedCode.InternalError:
                    case types_2.RejectedCode.NetworkRequestFailed:
                        // Ignore
                        break;
                    case types_2.RejectedCode.MaxOrderSizeExceeded:
                    case types_2.RejectedCode.OrderCancelled:
                    case types_2.RejectedCode.OrderFullyFilled:
                    case types_2.RejectedCode.OrderForIncorrectNetwork:
                    case types_2.RejectedCode.OrderExpired:
                    case types_2.RejectedCode.OrderUnfunded:
                        // Remove from DB
                        await connection.manager.delete(SignedOrderModel_1.SignedOrderModel, rejectedOrderInfo.orderHash);
                        break;
                    case types_2.RejectedCode.OrderAlreadyStored:
                        // TODO(fabio): Update fillable amount in DB
                        // Noop
                        break;
                    default:
                    // noop
                }
            }
        }
    }
    async _submitOrdersToMeshAsync(signedOrders) {
        const stringifiedSignedOrders = signedOrders.map(stringifyOrder);
        const payload = {
            jsonrpc: '2.0',
            id: 2,
            method: 'mesh_addOrders',
            params: [stringifiedSignedOrders],
        };
        const validationResponse = await this._wsClient.sendPayload(payload);
        const validationResults = validationResponse.result;
        return validationResults;
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
const stringifyOrder = (signedOrder) => {
    const stringifiedSignedOrder = {
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
        expirationTimeSeconds: signedOrder.expirationTimeSeconds.toString(),
        hash: _0x_js_1.orderHashUtils.getOrderHashHex(signedOrder),
    };
    return stringifiedSignedOrder;
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
