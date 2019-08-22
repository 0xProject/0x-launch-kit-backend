import { ContractWrappers, orderHashUtils, OrderStatus } from '0x.js';
import { DevUtilsContract, getContractAddressesForNetworkOrThrow } from '@0x/contract-wrappers';
import { assetDataUtils } from '@0x/order-utils';
import { OrderState, OrderWatcher, SignedOrder } from '@0x/order-watcher';
import { AssetProxyId, OrderStateValid, RevertReason } from '@0x/types';
import { BigNumber, intervalUtils } from '@0x/utils';
import { Provider } from 'ethereum-types';
import _ = require('lodash');

import { NETWORK_ID, ORDER_SHADOWING_MARGIN_MS, PERMANENT_CLEANUP_INTERVAL_MS } from '../config';
import {
    AdaptedOrderAndValidationResult,
    AdaptedValidationResults,
    APIOrderWithMetaData,
    onOrdersUpdateCallback,
} from '../types';
import { utils } from '../utils';

const VALIDATION_BATCH_SIZE = 100;
const ZERO = new BigNumber(0);

export class OrderWatcherAdapter {
    private readonly _orderWatcher: OrderWatcher;
    private readonly _contractWrappers: ContractWrappers;
    private readonly _shadowedOrderHashes: Map<string, number>;
    private readonly _orders: Map<string, SignedOrder>;
    private readonly _listeners = {
        added: new Set<onOrdersUpdateCallback>(),
        updated: new Set<onOrdersUpdateCallback>(),
        removed: new Set<onOrdersUpdateCallback>(),
    };
    constructor(provider: Provider, networkId: number, contractWrappers: ContractWrappers) {
        this._shadowedOrderHashes = new Map();
        this._orders = new Map();
        this._orderWatcher = new OrderWatcher(provider, networkId);
        this._orderWatcher.subscribe((err, orderState) => {
            if (err) {
                utils.log(err);
                return;
            }
            const { orderHash, isValid } = orderState as OrderState;
            if (!isValid) {
                this._shadowedOrderHashes.set(orderHash, Date.now());
                const order = this._orders.get(orderHash);
                if (order) {
                    for (const cb of this._listeners.removed) {
                        cb([
                            {
                                order,
                                metaData: {
                                    orderHash,
                                    remainingFillableTakerAssetAmount: ZERO,
                                },
                            },
                        ]);
                    }
                }
            } else {
                const { orderRelevantState } = orderState as OrderStateValid;
                // Order was shadowed and is now fillable, we previously removed the order with a REMOVE
                // an ADD should follow rather than an update
                const isAdded = this._shadowedOrderHashes.has(orderHash);
                this._shadowedOrderHashes.delete(orderHash);
                const order = this._orders.get(orderHash);
                if (order) {
                    const listeners = isAdded ? this._listeners.added : this._listeners.updated;
                    for (const cb of listeners) {
                        cb([
                            {
                                order,
                                metaData: {
                                    orderHash,
                                    remainingFillableTakerAssetAmount:
                                        orderRelevantState.remainingFillableTakerAssetAmount,
                                },
                            },
                        ]);
                    }
                }
            }
        });
        intervalUtils.setAsyncExcludingInterval(
            async () => {
                const permanentlyExpiredOrders: string[] = [];
                for (const [orderHash, shadowedAt] of this._shadowedOrderHashes) {
                    const now = Date.now();
                    if (shadowedAt + ORDER_SHADOWING_MARGIN_MS < now) {
                        permanentlyExpiredOrders.push(orderHash);
                    }
                }
                if (permanentlyExpiredOrders.length !== 0) {
                    const removedOrders: APIOrderWithMetaData[] = [];
                    for (const orderHash of permanentlyExpiredOrders) {
                        const order = this._orders.get(orderHash);
                        if (order) {
                            removedOrders.push({
                                order,
                                metaData: { orderHash, remainingFillableTakerAssetAmount: ZERO },
                            });
                            this._shadowedOrderHashes.delete(orderHash); // we need to remove this order so we don't keep shadowing it
                            this._orders.delete(orderHash);
                            this._orderWatcher.removeOrder(orderHash); // also remove from order watcher to avoid more callbacks
                        }
                    }
                    if (removedOrders.length > 0) {
                        for (const cb of this._listeners.removed) {
                            cb(removedOrders);
                        }
                    }
                }
            },
            PERMANENT_CLEANUP_INTERVAL_MS,
            utils.log,
        );
        this._contractWrappers = contractWrappers;
    }
    // tslint:disable-next-line:prefer-function-over-method no-empty
    public onReconnected(_cb: () => void): void {}
    // tslint:disable-next-line:prefer-function-over-method
    public async getOrdersAsync(): Promise<APIOrderWithMetaData[]> {
        return [];
    }
    public onOrdersAdded(cb: onOrdersUpdateCallback): void {
        this._listeners.added.add(cb);
    }
    public onOrdersRemoved(cb: onOrdersUpdateCallback): void {
        this._listeners.removed.add(cb);
    }
    public onOrdersUpdated(cb: onOrdersUpdateCallback): void {
        this._listeners.updated.add(cb);
    }
    public async addOrdersAsync(orders: SignedOrder[]): Promise<AdaptedValidationResults> {
        const erc20Orders = orders.filter(
            o =>
                assetDataUtils.decodeAssetDataOrThrow(o.makerAssetData).assetProxyId === AssetProxyId.ERC20 &&
                assetDataUtils.decodeAssetDataOrThrow(o.takerAssetData).assetProxyId === AssetProxyId.ERC20,
        );
        const remainingOrders = orders.filter(
            o =>
                assetDataUtils.decodeAssetDataOrThrow(o.makerAssetData).assetProxyId !== AssetProxyId.ERC20 ||
                assetDataUtils.decodeAssetDataOrThrow(o.takerAssetData).assetProxyId !== AssetProxyId.ERC20,
        );

        const erc20ValidationResults = await this._validateBatchERC20OrdersAsync(erc20Orders);
        const remainingValidationResults = await this._validateOrdersAsync(remainingOrders);
        const accepted = [...erc20ValidationResults.accepted, ...remainingValidationResults.accepted];
        const rejected = [...erc20ValidationResults.rejected, ...remainingValidationResults.rejected];
        for (const result of accepted) {
            const orderHash = orderHashUtils.getOrderHashHex(result.order);
            await this._orderWatcher.addOrderAsync(result.order);
            this._orders.set(orderHash, result.order);
        }
        if (accepted.length > 0) {
            for (const cb of this._listeners.added) {
                cb(accepted);
            }
        }
        return {
            accepted,
            rejected,
        };
    }
    private async _validateBatchERC20OrdersAsync(orders: SignedOrder[]): Promise<AdaptedValidationResults> {
        const accepted: AdaptedOrderAndValidationResult[] = [];
        const rejected: AdaptedOrderAndValidationResult[] = [];
        // Batch so we don't request too many
        const orderChunks = _.chunk(orders, VALIDATION_BATCH_SIZE);
        let ordersAndTradersInfos: Array<{ orderInfo: any; traderInfo: any }> = [];
        for (const chunk of orderChunks) {
            const [
                orderInfos,
                traderInfos,
            ] = await this._contractWrappers.orderValidator.getOrdersAndTradersInfo.callAsync(
                chunk,
                chunk.map(o => o.makerAddress),
            );
            orderInfos.forEach((_r, i) => {
                ordersAndTradersInfos = [
                    ...ordersAndTradersInfos,
                    { orderInfo: orderInfos[i], traderInfo: traderInfos[i] },
                ];
            });
        }
        ordersAndTradersInfos.forEach((result, i) => {
            const order = orders[i];
            const metaData = { orderHash: result.orderInfo.orderHash, remainingFillableTakerAssetAmount: ZERO };
            if (result.orderInfo.orderStatus !== OrderStatus.Fillable) {
                rejected.push({ message: RevertReason.OrderUnfillable, order, metaData });
            } else if (result.traderInfo.makerAllowance.isEqualTo(0)) {
                rejected.push({ message: RevertReason.Erc20InsufficientAllowance, order, metaData });
            } else if (result.traderInfo.makerBalance.isEqualTo(0)) {
                rejected.push({ message: RevertReason.Erc20InsufficientBalance, order, metaData });
            } else if (result.traderInfo.makerZrxAllowance.isGreaterThan(0) && order.makerFee.isGreaterThan(0)) {
                rejected.push({ message: RevertReason.Erc20InsufficientAllowance, order, metaData });
            } else if (result.traderInfo.makerZrxBalance.isGreaterThan(0) && order.makerFee.isGreaterThan(0)) {
                rejected.push({ message: RevertReason.Erc20InsufficientBalance, order, metaData });
            } else {
                accepted.push({
                    order,
                    message: undefined,
                    metaData: {
                        ...metaData,
                        remainingFillableTakerAssetAmount: order.takerAssetAmount.minus(
                            result.orderInfo.orderTakerAssetFilledAmount,
                        ),
                    },
                });
            }
        });
        return { accepted, rejected };
    }
    private async _validateOrdersAsync(orders: SignedOrder[]): Promise<AdaptedValidationResults> {
        const accepted: AdaptedOrderAndValidationResult[] = [];
        const rejected: AdaptedOrderAndValidationResult[] = [];
        const contractAddresses = getContractAddressesForNetworkOrThrow(NETWORK_ID);
        const orderChunks = _.chunk(orders, VALIDATION_BATCH_SIZE);
        const devUtils = new DevUtilsContract(contractAddresses.devUtils, this._contractWrappers.getProvider());
        for (const chunk of orderChunks) {
            const [
                orderInfos,
                fillableTakerAssetAmounts,
                isValidSignatures,
            ] = await devUtils.getOrderRelevantStates.callAsync(chunk, chunk.map(o => o.signature));
            orderInfos.forEach((orderInfo, i) => {
                const order = chunk[i];
                const metaData = { orderHash: orderInfo.orderHash, remainingFillableTakerAssetAmount: ZERO };
                if (orderInfo.orderStatus !== OrderStatus.Fillable) {
                    rejected.push({ message: RevertReason.OrderUnfillable, order, metaData });
                } else if (fillableTakerAssetAmounts[i].isEqualTo(0)) {
                    rejected.push({ message: RevertReason.Erc20InsufficientBalance, order, metaData });
                } else if (!isValidSignatures[i]) {
                    rejected.push({ message: RevertReason.InvalidSignature, order, metaData });
                } else {
                    accepted.push({
                        order,
                        message: undefined,
                        metaData: {
                            ...metaData,
                            remainingFillableTakerAssetAmount: fillableTakerAssetAmounts[i],
                        },
                    });
                }
            });
        }

        return { accepted, rejected };
    }
}
