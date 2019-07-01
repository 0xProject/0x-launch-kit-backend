import { assetDataUtils, BigNumber, orderHashUtils, RPCSubprovider, SignedOrder, Web3ProviderEngine } from '0x.js';
import { APIOrder, OrderbookResponse, PaginatedCollection } from '@0x/connect';
import { orderParsingUtils } from '@0x/order-utils';
import { Asset, AssetPairsItem, AssetProxyId, OrdersRequestOpts } from '@0x/types';
import { errorUtils } from '@0x/utils';
import * as _ from 'lodash';
import * as Web3Providers from 'web3-providers';

import { DEFAULT_ERC20_TOKEN_PRECISION, RPC_URL } from './config';
import { MAX_TOKEN_SUPPLY_POSSIBLE } from './constants';
import { getDBConnection } from './db_connection';
import { SignedOrderModel } from './models/SignedOrderModel';
import { paginate } from './paginator';
import { OrderEventKind, OrderEventPayload, RejectedCode, StringifiedSignedOrder, ValidationResults } from './types';

const MESH_WS_PORT = 60557;
const MESH_WS_ENDPOINT = `ws://localhost:${MESH_WS_PORT}`;
const BATCH_SIZE = 18;
const SLEEP_INTERVAL = 500;

export class OrderBook {
    private _wsClient: any;
    private _isConnectedToMesh: boolean;
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
    // TODO:(leo) Do all filtering and pagination in a DB (requires stored procedures or redundant fields)
    public static async getOrdersAsync(
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
    public static async getOrderBookAsync(
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
    private static async _onOrderEventCallbackAsync(eventPayload: OrderEventPayload): Promise<void> {
        const connection = getDBConnection();
        for (const event of eventPayload.result) {
            const signedOrder = orderParsingUtils.convertOrderStringFieldsToBigNumber(event.signedOrder);
            switch (event.kind) {
                case OrderEventKind.Added: {
                    const signedOrderModel = serializeOrder(signedOrder);
                    await connection.manager.save(signedOrderModel);
                    break;
                }
                case OrderEventKind.Cancelled:
                case OrderEventKind.Expired:
                case OrderEventKind.FullyFilled:
                case OrderEventKind.Unfunded: {
                    await connection.manager.delete(SignedOrderModel, event.orderHash);
                    break;
                }
                case OrderEventKind.Filled: {
                    // TODO(fabio): Once we store remaining fillable amount, update DB
                    break;
                }
                case OrderEventKind.FillabilityIncreased: {
                    // Check if in DB, if not, re-add it
                    const signedOrderModels = await connection.manager.findOne(SignedOrderModel, event.orderHash);
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
        const provider = new Web3ProviderEngine();
        provider.addProvider(new RPCSubprovider(RPC_URL));
        (provider as any)._ready.go();
        (provider as any)._running = true;

        this._isConnectedToMesh = false;
        // Fire-and-forget
        this._connectToMeshAsync();
    }
    public async addOrderAsync(signedOrder: SignedOrder): Promise<void> {
        const connection = getDBConnection();
        if (!this._isConnectedToMesh) {
            throw new Error('Not connected to Mesh');
        }
        const validationResults = await this._submitOrdersToMeshAsync([signedOrder]);
        if (validationResults.rejected !== null) {
            const rejection = validationResults.rejected[0];
            throw new Error(rejection.status.code);
        } else {
            // TODO(fabio): Store the `fillableTakerAssetAmount`?
            const signedOrderModel = serializeOrder(signedOrder);
            await connection.manager.save(signedOrderModel);
        }
    }
    public async addExistingOrdersToOrderWatcherAsync(): Promise<void> {
        const connection = getDBConnection();

        while (!this._isConnectedToMesh) {
            console.log('Attempting to connnect to Mesh...');
            await sleepAsync(SLEEP_INTERVAL);
        }
        console.log('Mesh connected!');

        const signedOrderModels = (await connection.manager.find(SignedOrderModel)) as Array<
            Required<SignedOrderModel>
        >;
        if (signedOrderModels.length === 0) {
            return;
        }
        const signedOrders = signedOrderModels.map(deserializeOrder);
        let numBatches = Math.floor(signedOrders.length / BATCH_SIZE);
        numBatches = numBatches === 0 && signedOrders.length > 0 ? 1 : numBatches;

        for (let i = 0; i < numBatches; i++) {
            const batch = signedOrders.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE + 1);
            const validationResults = await this._submitOrdersToMeshAsync(batch);
            // TODO(fabio): Once we store fillable amounts in DB, update them for all accepted orders
            for (const rejectedOrderInfo of validationResults.rejected) {
                switch (rejectedOrderInfo.status.code) {
                    case RejectedCode.InternalError:
                    case RejectedCode.NetworkRequestFailed:
                        // Ignore
                        break;
                    case RejectedCode.MaxOrderSizeExceeded:
                    case RejectedCode.OrderCancelled:
                    case RejectedCode.OrderFullyFilled:
                    case RejectedCode.OrderForIncorrectNetwork:
                    case RejectedCode.OrderExpired:
                    case RejectedCode.OrderUnfunded:
                        // Remove from DB
                        await connection.manager.delete(SignedOrderModel, rejectedOrderInfo.orderHash);
                        break;

                    case RejectedCode.OrderAlreadyStored:
                        // TODO(fabio): Update fillable amount in DB
                        // Noop
                        break;
                    default:
                    // noop
                }
            }
        }
    }
    private async _connectToMeshAsync(): Promise<void> {
        while (true) {
            try {
                this._wsClient = new Web3Providers.WebsocketProvider(MESH_WS_ENDPOINT);
                const subscriptionId = await this._wsClient.subscribe('mesh_subscribe', 'orders', []);
                this._wsClient.on(subscriptionId, OrderBook._onOrderEventCallbackAsync.bind(this));
                this._isConnectedToMesh = true;
                return; // Done
            } catch (err) {
                // Try again
            }
            await sleepAsync(SLEEP_INTERVAL);
        }
    }
    // TODO: Remove hashh from orders.
    private async _submitOrdersToMeshAsync(signedOrders: SignedOrder[]): Promise<ValidationResults> {
        const stringifiedSignedOrders = signedOrders.map(stringifyOrder);
        console.log(JSON.stringify(stringifiedSignedOrders));
        const validationResults = await this._wsClient.send('mesh_addOrders', [stringifiedSignedOrders]);
        console.log('validationResults', JSON.stringify(validationResults));
        return validationResults;
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

const stringifyOrder = (signedOrder: SignedOrder): StringifiedSignedOrder => {
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
    };
    return stringifiedSignedOrder;
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

function sleepAsync(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
