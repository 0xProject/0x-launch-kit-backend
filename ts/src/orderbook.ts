import {
    assetDataUtils,
    BigNumber,
    ContractWrappers,
    orderHashUtils,
    RPCSubprovider,
    SignedOrder,
    Web3ProviderEngine,
} from '0x.js';
import { APIOrder, OrderbookResponse, PaginatedCollection } from '@0x/connect';
import { OrderState, OrderWatcher } from '@0x/order-watcher';
import { Asset, AssetPairsItem, AssetProxyId, OrdersRequestOpts } from '@0x/types';
import { errorUtils, intervalUtils } from '@0x/utils';
import * as _ from 'lodash';

import {
    DEFAULT_ERC20_TOKEN_PRECISION,
    NETWORK_ID,
    ORDER_SHADOWING_MARGIN_MS,
    PERMANENT_CLEANUP_INTERVAL_MS,
    RPC_URL,
} from './config';
import { MAX_TOKEN_SUPPLY_POSSIBLE } from './constants';

import { getDBConnection } from './db_connection';
import { SignedOrderModel } from './models/SignedOrderModel';
import { paginate } from './paginator';
import { utils } from './utils';

export class OrderBook {
    private readonly _orderWatcher: OrderWatcher;
    private readonly _contractWrappers: ContractWrappers;
    // Mapping from an order hash to the timestamp when it was shadowed
    private readonly _shadowedOrders: Map<string, number>;
    public static async getOrderByHashIfExistsAsync(orderHash: string): Promise<APIOrder | undefined> {
        const connection = getDBConnection();
        const signedOrderModelIfExists = await connection.manager.findOne(SignedOrderModel, orderHash);
        if (_.isUndefined(signedOrderModelIfExists)) {
            return undefined;
        } else {
            const deserializedOrder = deserializeOrder(signedOrderModelIfExists as Required<SignedOrderModel>);
            return { metaData: {}, order: deserializedOrder };
        }
    }
    public static async getAssetPairsAsync(
        page: number,
        perPage: number,
        assetDataA: string,
        assetDataB: string,
    ): Promise<PaginatedCollection<AssetPairsItem>> {
        const connection = getDBConnection();
        const signedOrderModels = (await connection.manager.find(SignedOrderModel)) as Array<
            Required<SignedOrderModel>
        >;
        const erc721AssetDataToAsset = (assetData: string): Asset => {
            const asset: Asset = {
                minAmount: new BigNumber(0),
                maxAmount: new BigNumber(1),
                precision: 0,
                assetData,
            };
            return asset;
        };
        const erc20AssetDataToAsset = (assetData: string): Asset => {
            const asset: Asset = {
                minAmount: new BigNumber(0),
                maxAmount: MAX_TOKEN_SUPPLY_POSSIBLE,
                precision: DEFAULT_ERC20_TOKEN_PRECISION,
                assetData,
            };
            return asset;
        };
        const assetDataToAsset = (assetData: string): Asset => {
            const assetProxyId = assetDataUtils.decodeAssetProxyId(assetData);
            let asset: Asset;
            switch (assetProxyId) {
                case AssetProxyId.ERC20:
                    asset = erc20AssetDataToAsset(assetData);
                    break;
                case AssetProxyId.ERC721:
                    asset = erc721AssetDataToAsset(assetData);
                    break;
                default:
                    throw errorUtils.spawnSwitchErr('assetProxyId', assetProxyId);
            }
            return asset;
        };
        const signedOrderToAssetPair = (signedOrder: SignedOrder): AssetPairsItem => {
            return {
                assetDataA: assetDataToAsset(signedOrder.makerAssetData),
                assetDataB: assetDataToAsset(signedOrder.takerAssetData),
            };
        };
        const assetPairsItems: AssetPairsItem[] = signedOrderModels.map(deserializeOrder).map(signedOrderToAssetPair);
        let nonPaginatedFilteredAssetPairs: AssetPairsItem[];
        if (_.isUndefined(assetDataA) && _.isUndefined(assetDataB)) {
            nonPaginatedFilteredAssetPairs = assetPairsItems;
        } else if (!_.isUndefined(assetDataA) && !_.isUndefined(assetDataB)) {
            const containsAssetDataAAndAssetDataB = (assetPair: AssetPairsItem) =>
                (assetPair.assetDataA.assetData === assetDataA && assetPair.assetDataB.assetData === assetDataB) ||
                (assetPair.assetDataA.assetData === assetDataB && assetPair.assetDataB.assetData === assetDataA);
            nonPaginatedFilteredAssetPairs = assetPairsItems.filter(containsAssetDataAAndAssetDataB);
        } else {
            const assetData = assetDataA || assetDataB;
            const containsAssetData = (assetPair: AssetPairsItem) =>
                assetPair.assetDataA.assetData === assetData || assetPair.assetDataB.assetData === assetData;
            nonPaginatedFilteredAssetPairs = assetPairsItems.filter(containsAssetData);
        }
        const uniqueNonPaginatedFilteredAssetPairs = _.uniqWith(nonPaginatedFilteredAssetPairs, _.isEqual.bind(_));
        const paginatedFilteredAssetPairs = paginate(uniqueNonPaginatedFilteredAssetPairs, page, perPage);
        return paginatedFilteredAssetPairs;
    }
    constructor() {
        const provider = new Web3ProviderEngine();
        provider.addProvider(new RPCSubprovider(RPC_URL));
        provider.start();

        this._shadowedOrders = new Map();
        this._contractWrappers = new ContractWrappers(provider, {
            networkId: NETWORK_ID,
        });
        this._orderWatcher = new OrderWatcher(provider, NETWORK_ID);
        this._orderWatcher.subscribe(this.onOrderStateChangeCallback.bind(this));
        intervalUtils.setAsyncExcludingInterval(
            this.onCleanUpInvalidOrdersAsync.bind(this),
            PERMANENT_CLEANUP_INTERVAL_MS,
            utils.log,
        );
    }
    public onOrderStateChangeCallback(err: Error | null, orderState?: OrderState): void {
        if (!_.isNull(err)) {
            utils.log(err);
        } else {
            const state = orderState as OrderState;
            if (!state.isValid) {
                this._shadowedOrders.set(state.orderHash, Date.now());
            } else {
                this._shadowedOrders.delete(state.orderHash);
            }
        }
    }
    public async onCleanUpInvalidOrdersAsync(): Promise<void> {
        const permanentlyExpiredOrders: string[] = [];
        for (const [orderHash, shadowedAt] of this._shadowedOrders) {
            const now = Date.now();
            if (shadowedAt + ORDER_SHADOWING_MARGIN_MS < now) {
                permanentlyExpiredOrders.push(orderHash);
                this._shadowedOrders.delete(orderHash); // we need to remove this order so we don't keep shadowing it
                this._orderWatcher.removeOrder(orderHash); // also remove from order watcher to avoid more callbacks
            }
        }
        if (!_.isEmpty(permanentlyExpiredOrders)) {
            const connection = getDBConnection();
            await connection.manager.delete(SignedOrderModel, permanentlyExpiredOrders);
        }
    }
    public async addOrderAsync(signedOrder: SignedOrder): Promise<void> {
        const connection = getDBConnection();
        await this._contractWrappers.exchange.validateOrderFillableOrThrowAsync(signedOrder);
        await this._orderWatcher.addOrderAsync(signedOrder);
        const signedOrderModel = serializeOrder(signedOrder);
        await connection.manager.save(signedOrderModel);
    }
    public async getOrderBookAsync(
        page: number,
        perPage: number,
        baseAssetData: string,
        quoteAssetData: string,
    ): Promise<OrderbookResponse> {
        const connection = getDBConnection();
        const bidSignedOrderModels = (await connection.manager.find(SignedOrderModel, {
            where: { takerAssetData: baseAssetData, makerAssetData: quoteAssetData },
        })) as Array<Required<SignedOrderModel>>;
        const askSignedOrderModels = (await connection.manager.find(SignedOrderModel, {
            where: { takerAssetData: quoteAssetData, makerAssetData: baseAssetData },
        })) as Array<Required<SignedOrderModel>>;
        const bidApiOrders: APIOrder[] = bidSignedOrderModels
            .map(deserializeOrder)
            .filter(order => !this._shadowedOrders.has(orderHashUtils.getOrderHashHex(order)))
            .sort((orderA, orderB) => compareBidOrder(orderA, orderB))
            .map(signedOrder => ({ metaData: {}, order: signedOrder }));
        const askApiOrders: APIOrder[] = askSignedOrderModels
            .map(deserializeOrder)
            .filter(order => !this._shadowedOrders.has(orderHashUtils.getOrderHashHex(order)))
            .sort((orderA, orderB) => compareAskOrder(orderA, orderB))
            .map(signedOrder => ({ metaData: {}, order: signedOrder }));
        const paginatedBidApiOrders = paginate(bidApiOrders, page, perPage);
        const paginatedAskApiOrders = paginate(askApiOrders, page, perPage);
        return {
            bids: paginatedBidApiOrders,
            asks: paginatedAskApiOrders,
        };
    }
    // TODO:(leo) Do all filtering and pagination in a DB (requires stored procedures or redundant fields)
    public async getOrdersAsync(
        page: number,
        perPage: number,
        ordersFilterParams: OrdersRequestOpts,
    ): Promise<PaginatedCollection<APIOrder>> {
        const connection = getDBConnection();
        // Pre-filters
        const filterObjectWithValuesIfExist: Partial<SignedOrder> = {
            exchangeAddress: ordersFilterParams.exchangeAddress,
            senderAddress: ordersFilterParams.senderAddress,
            makerAssetData: ordersFilterParams.makerAssetData,
            takerAssetData: ordersFilterParams.takerAssetData,
            makerAddress: ordersFilterParams.makerAddress,
            takerAddress: ordersFilterParams.takerAddress,
            feeRecipientAddress: ordersFilterParams.feeRecipientAddress,
        };
        const filterObject = _.pickBy(filterObjectWithValuesIfExist, _.identity.bind(_));
        const signedOrderModels = (await connection.manager.find(SignedOrderModel, { where: filterObject })) as Array<
            Required<SignedOrderModel>
        >;
        let signedOrders = _.map(signedOrderModels, deserializeOrder);
        // Post-filters
        signedOrders = signedOrders
            .filter(order => !this._shadowedOrders.has(orderHashUtils.getOrderHashHex(order)))
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
                    includesTokenAddress(signedOrder.makerAssetData, ordersFilterParams.makerAssetAddress),
            )
            .filter(
                // takerAssetAddress
                signedOrder =>
                    _.isUndefined(ordersFilterParams.takerAssetAddress) ||
                    includesTokenAddress(signedOrder.takerAssetData, ordersFilterParams.takerAssetAddress),
            )
            .filter(
                // makerAssetProxyId
                signedOrder =>
                    _.isUndefined(ordersFilterParams.makerAssetProxyId) ||
                    assetDataUtils.decodeAssetDataOrThrow(signedOrder.makerAssetData).assetProxyId ===
                        ordersFilterParams.makerAssetProxyId,
            )
            .filter(
                // makerAssetProxyId
                signedOrder =>
                    _.isUndefined(ordersFilterParams.takerAssetProxyId) ||
                    assetDataUtils.decodeAssetDataOrThrow(signedOrder.takerAssetData).assetProxyId ===
                        ordersFilterParams.takerAssetProxyId,
            );
        const apiOrders: APIOrder[] = signedOrders.map(signedOrder => ({ metaData: {}, order: signedOrder }));
        const paginatedApiOrders = paginate(apiOrders, page, perPage);
        return paginatedApiOrders;
    }
    public async addExistingOrdersToOrderWatcherAsync(): Promise<void> {
        const connection = getDBConnection();
        const signedOrderModels = (await connection.manager.find(SignedOrderModel)) as Array<
            Required<SignedOrderModel>
        >;
        const signedOrders = signedOrderModels.map(deserializeOrder);
        for (const signedOrder of signedOrders) {
            try {
                await this._contractWrappers.exchange.validateOrderFillableOrThrowAsync(signedOrder);
                await this._orderWatcher.addOrderAsync(signedOrder);
            } catch (err) {
                const orderHash = orderHashUtils.getOrderHashHex(signedOrder);
                await connection.manager.delete(SignedOrderModel, orderHash);
            }
        }
    }
}

const compareAskOrder = (orderA: SignedOrder, orderB: SignedOrder): number => {
    const orderAPrice = orderA.takerAssetAmount.div(orderA.makerAssetAmount);
    const orderBPrice = orderB.takerAssetAmount.div(orderB.makerAssetAmount);
    if (!orderAPrice.isEqualTo(orderBPrice)) {
        return orderAPrice.comparedTo(orderBPrice);
    }

    return compareOrder(orderA, orderB);
};

const compareBidOrder = (orderA: SignedOrder, orderB: SignedOrder): number => {
    const orderAPrice = orderA.makerAssetAmount.div(orderA.takerAssetAmount);
    const orderBPrice = orderB.makerAssetAmount.div(orderB.takerAssetAmount);
    if (!orderAPrice.isEqualTo(orderBPrice)) {
        return orderBPrice.comparedTo(orderAPrice);
    }

    return compareOrder(orderA, orderB);
};

const compareOrder = (orderA: SignedOrder, orderB: SignedOrder): number => {
    const orderAFeePrice = orderA.takerFee.div(orderA.takerAssetAmount);
    const orderBFeePrice = orderB.takerFee.div(orderB.takerAssetAmount);
    if (!orderAFeePrice.isEqualTo(orderBFeePrice)) {
        return orderBFeePrice.comparedTo(orderAFeePrice);
    }

    return orderA.expirationTimeSeconds.comparedTo(orderB.expirationTimeSeconds);
};

const includesTokenAddress = (assetData: string, tokenAddress: string): boolean => {
    const decodedAssetData = assetDataUtils.decodeAssetDataOrThrow(assetData);
    if (assetDataUtils.isMultiAssetData(decodedAssetData)) {
        for (const [, nestedAssetDataElement] of decodedAssetData.nestedAssetData.entries()) {
            if (includesTokenAddress(nestedAssetDataElement, tokenAddress)) {
                return true;
            }
        }
        return false;
    } else {
        return decodedAssetData.tokenAddress === tokenAddress;
    }
};

const deserializeOrder = (signedOrderModel: Required<SignedOrderModel>): SignedOrder => {
    const signedOrder: SignedOrder = {
        signature: signedOrderModel.signature,
        senderAddress: signedOrderModel.senderAddress,
        makerAddress: signedOrderModel.makerAddress,
        takerAddress: signedOrderModel.takerAddress,
        makerFee: new BigNumber(signedOrderModel.makerFee),
        takerFee: new BigNumber(signedOrderModel.takerFee),
        makerAssetAmount: new BigNumber(signedOrderModel.makerAssetAmount),
        takerAssetAmount: new BigNumber(signedOrderModel.takerAssetAmount),
        makerAssetData: signedOrderModel.makerAssetData,
        takerAssetData: signedOrderModel.takerAssetData,
        salt: new BigNumber(signedOrderModel.salt),
        exchangeAddress: signedOrderModel.exchangeAddress,
        feeRecipientAddress: signedOrderModel.feeRecipientAddress,
        expirationTimeSeconds: new BigNumber(signedOrderModel.expirationTimeSeconds),
    };
    return signedOrder;
};

const serializeOrder = (signedOrder: SignedOrder): SignedOrderModel => {
    const signedOrderModel = new SignedOrderModel({
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
        hash: orderHashUtils.getOrderHashHex(signedOrder),
    });
    return signedOrderModel;
};
