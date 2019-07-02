import { assetDataUtils, BigNumber, orderHashUtils, SignedOrder } from '0x.js';
import { APIOrder, OrderbookResponse, PaginatedCollection } from '@0x/connect';
import { Asset, AssetPairsItem, AssetProxyId, OrdersRequestOpts } from '@0x/types';
import { errorUtils } from '@0x/utils';
import * as _ from 'lodash';

import { DEFAULT_ERC20_TOKEN_PRECISION } from './config';
import { MAX_TOKEN_SUPPLY_POSSIBLE } from './constants';
import { getDBConnection } from './db_connection';
import { SignedOrderModel } from './models/SignedOrderModel';
import { MeshAdapter } from './order_watchers/mesh_adapter';
import { OrderWatcherAdapter } from './order_watchers/order_watcher_adapter';
import { OrderWatchersFactory } from './order_watchers/order_watchers_factory';
import { paginate } from './paginator';
import { APIOrderWithMetaData, OrderWatcherLifeCycleEvents } from './types';

// tslint:disable-next-line:no-var-requires
const d = require('debug')('orderbook');

const DEFAULT_ERC721_ASSET = {
    minAmount: new BigNumber(0),
    maxAmount: new BigNumber(1),
    precision: 0,
};
const DEFAULT_ERC20_ASSET = {
    minAmount: new BigNumber(0),
    maxAmount: MAX_TOKEN_SUPPLY_POSSIBLE,
    precision: DEFAULT_ERC20_TOKEN_PRECISION,
};

export class OrderBook {
    private readonly _orderWatcher: OrderWatcherAdapter | MeshAdapter;
    public static async getOrderByHashIfExistsAsync(orderHash: string): Promise<APIOrder | undefined> {
        const connection = getDBConnection();
        const signedOrderModelIfExists = await connection.manager.findOne(SignedOrderModel, orderHash);
        if (signedOrderModelIfExists === undefined) {
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

        const assetPairsItems: AssetPairsItem[] = signedOrderModels.map(deserializeOrder).map(signedOrderToAssetPair);
        let nonPaginatedFilteredAssetPairs: AssetPairsItem[];
        if (assetDataA === undefined && assetDataB === undefined) {
            nonPaginatedFilteredAssetPairs = assetPairsItems;
        } else if (assetDataA !== undefined && assetDataB !== undefined) {
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
    public static async onOrderLifeCycleEventAsync(
        lifecycleEvent: OrderWatcherLifeCycleEvents,
        orders: APIOrderWithMetaData[],
    ): Promise<void> {
        const connection = getDBConnection();
        if (lifecycleEvent === OrderWatcherLifeCycleEvents.Add) {
            const signedOrdersModel = orders.map(o => serializeOrder(o.order));
            d('ADD', orders.map(o => o.metaData));
            await connection.manager.save(signedOrdersModel);
        } else if (lifecycleEvent === OrderWatcherLifeCycleEvents.Remove) {
            const orderHashes = orders.map(o => o.metaData.orderHash);
            d('REMOVE', orders.map(o => o.metaData));
            await connection.manager.delete(SignedOrderModel, orderHashes);
        }
    }
    constructor() {
        this._orderWatcher = OrderWatchersFactory.build();
        this._orderWatcher.onOrdersAdded(async orders => {
            await OrderBook.onOrderLifeCycleEventAsync(OrderWatcherLifeCycleEvents.Add, orders);
        });
        this._orderWatcher.onOrdersRemoved(async orders => {
            await OrderBook.onOrderLifeCycleEventAsync(OrderWatcherLifeCycleEvents.Remove, orders);
        });
        this._orderWatcher.onReconnected(async () => {
            d('Reconnecting to orderwatcher');
            await this.addExistingOrdersToOrderWatcherAsync();
        });
    }
    public async addOrderAsync(signedOrder: SignedOrder): Promise<void> {
        const { rejected } = await this._orderWatcher.addOrdersAsync([signedOrder]);
        if (rejected.length !== 0) {
            throw new Error(rejected[0].message);
        }
        // Mesh/OrderWatcher will call back when the order is added
    }
    // tslint:disable-next-line:prefer-function-over-method
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
            .sort((orderA, orderB) => compareBidOrder(orderA, orderB))
            .map(signedOrder => ({ metaData: {}, order: signedOrder }));
        const askApiOrders: APIOrder[] = askSignedOrderModels
            .map(deserializeOrder)
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
    // tslint:disable-next-line:prefer-function-over-method
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
            .filter(
                // traderAddress
                signedOrder =>
                    ordersFilterParams.traderAddress === undefined ||
                    signedOrder.makerAddress === ordersFilterParams.traderAddress ||
                    signedOrder.takerAddress === ordersFilterParams.traderAddress,
            )
            .filter(
                // makerAssetAddress
                signedOrder =>
                    ordersFilterParams.makerAssetAddress === undefined ||
                    includesTokenAddress(signedOrder.makerAssetData, ordersFilterParams.makerAssetAddress),
            )
            .filter(
                // takerAssetAddress
                signedOrder =>
                    ordersFilterParams.takerAssetAddress === undefined ||
                    includesTokenAddress(signedOrder.takerAssetData, ordersFilterParams.takerAssetAddress),
            )
            .filter(
                // makerAssetProxyId
                signedOrder =>
                    ordersFilterParams.makerAssetProxyId === undefined ||
                    assetDataUtils.decodeAssetDataOrThrow(signedOrder.makerAssetData).assetProxyId ===
                        ordersFilterParams.makerAssetProxyId,
            )
            .filter(
                // makerAssetProxyId
                signedOrder =>
                    ordersFilterParams.takerAssetProxyId === undefined ||
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
            await OrderBook.onOrderLifeCycleEventAsync(OrderWatcherLifeCycleEvents.Remove, rejected);
        }
        // Sync the order watching service state locally
        const orders = await getOrdersPromise;
        if (orders.length > 0) {
            await OrderBook.onOrderLifeCycleEventAsync(OrderWatcherLifeCycleEvents.Add, orders);
        }
    }
}

const compareAskOrder = (orderA: SignedOrder, orderB: SignedOrder): number => {
    const orderAPrice = orderA.takerAssetAmount.div(orderA.makerAssetAmount);
    const orderBPrice = orderB.takerAssetAmount.div(orderB.makerAssetAmount);
    if (!orderAPrice.isEqualTo(orderBPrice)) {
        return orderAPrice.comparedTo(orderBPrice);
    }

    return compareOrderByFeeRatio(orderA, orderB);
};

const compareBidOrder = (orderA: SignedOrder, orderB: SignedOrder): number => {
    const orderAPrice = orderA.makerAssetAmount.div(orderA.takerAssetAmount);
    const orderBPrice = orderB.makerAssetAmount.div(orderB.takerAssetAmount);
    if (!orderAPrice.isEqualTo(orderBPrice)) {
        return orderBPrice.comparedTo(orderAPrice);
    }

    return compareOrderByFeeRatio(orderA, orderB);
};

const compareOrderByFeeRatio = (orderA: SignedOrder, orderB: SignedOrder): number => {
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
    } else if (!assetDataUtils.isStaticCallAssetData(decodedAssetData)) {
        return decodedAssetData.tokenAddress === tokenAddress;
    }
    return false;
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

const erc721AssetDataToAsset = (assetData: string): Asset => ({
    ...DEFAULT_ERC721_ASSET,
    assetData,
});
const erc20AssetDataToAsset = (assetData: string): Asset => ({
    ...DEFAULT_ERC20_ASSET,
    assetData,
});
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
