'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const _0x_js_1 = require('0x.js');
const order_utils_1 = require('@0x/order-utils');
const order_watcher_1 = require('@0x/order-watcher');
const types_1 = require('@0x/types');
const utils_1 = require('@0x/utils');
const _ = require('lodash');
const config_1 = require('../config');
const utils_2 = require('../utils');
// tslint:disable-next-line:no-var-requires
const d = require('debug')('orderwatcher');
const VALIDATION_BATCH_SIZE = 100;
const ZERO = new utils_1.BigNumber(0);
class OrderWatcherAdapter {
    constructor(provider, networkId, contractWrappers) {
        this._listeners = {
            added: new Set(),
            updated: new Set(),
            removed: new Set(),
        };
        this._shadowedOrderHashes = new Map();
        this._orders = new Map();
        this._orderWatcher = new order_watcher_1.OrderWatcher(provider, networkId);
        this._orderWatcher.subscribe((err, orderState) => {
            if (err) {
                utils_2.utils.log(err);
                return;
            }
            const { orderHash, isValid } = orderState;
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
                const { orderRelevantState } = orderState;
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
        utils_1.intervalUtils.setAsyncExcludingInterval(
            async () => {
                const permanentlyExpiredOrders = [];
                for (const [orderHash, shadowedAt] of this._shadowedOrderHashes) {
                    const now = Date.now();
                    if (shadowedAt + config_1.ORDER_SHADOWING_MARGIN_MS < now) {
                        permanentlyExpiredOrders.push(orderHash);
                    }
                }
                if (permanentlyExpiredOrders.length !== 0) {
                    const removedOrders = [];
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
            config_1.PERMANENT_CLEANUP_INTERVAL_MS,
            utils_2.utils.log,
        );
        this._contractWrappers = contractWrappers;
    }
    // tslint:disable-next-line:prefer-function-over-method no-empty
    onReconnected(_cb) {}
    // tslint:disable-next-line:prefer-function-over-method
    async getOrdersAsync() {
        return [];
    }
    onOrdersAdded(cb) {
        this._listeners.added.add(cb);
    }
    onOrdersRemoved(cb) {
        this._listeners.removed.add(cb);
    }
    onOrdersUpdated(cb) {
        this._listeners.updated.add(cb);
    }
    async addOrdersAsync(orders) {
        const erc20Orders = orders.filter(
            o =>
                order_utils_1.assetDataUtils.decodeAssetDataOrThrow(o.makerAssetData).assetProxyId ===
                    types_1.AssetProxyId.ERC20 &&
                order_utils_1.assetDataUtils.decodeAssetDataOrThrow(o.takerAssetData).assetProxyId ===
                    types_1.AssetProxyId.ERC20,
        );
        const remainingOrders = orders.filter(
            o =>
                order_utils_1.assetDataUtils.decodeAssetDataOrThrow(o.makerAssetData).assetProxyId !==
                    types_1.AssetProxyId.ERC20 ||
                order_utils_1.assetDataUtils.decodeAssetDataOrThrow(o.takerAssetData).assetProxyId !==
                    types_1.AssetProxyId.ERC20,
        );
        const erc20ValidationResults = await this._validateBatchERC20OrdersAsync(erc20Orders);
        const remainingValidationResults = await this._validateOrdersAsync(remainingOrders);
        const accepted = [...erc20ValidationResults.accepted, ...remainingValidationResults.accepted];
        const rejected = [...erc20ValidationResults.rejected, ...remainingValidationResults.rejected];
        for (const result of accepted) {
            const orderHash = _0x_js_1.orderHashUtils.getOrderHashHex(result.order);
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
    async _validateBatchERC20OrdersAsync(orders) {
        const accepted = [];
        const rejected = [];
        // Batch so we don't request too many
        const orderChunks = _.chunk(orders, VALIDATION_BATCH_SIZE);
        let ordersAndTradersInfos = [];
        for (const chunk of orderChunks) {
            const info = await this._contractWrappers.orderValidator.getOrdersAndTradersInfoAsync(
                chunk,
                chunk.map(o => o.makerAddress),
            );
            ordersAndTradersInfos = [...ordersAndTradersInfos, ...info];
        }
        ordersAndTradersInfos.forEach((result, i) => {
            const order = orders[i];
            const metaData = { orderHash: result.orderInfo.orderHash, remainingFillableTakerAssetAmount: ZERO };
            if (result.orderInfo.orderStatus !== _0x_js_1.OrderStatus.Fillable) {
                rejected.push({ message: types_1.RevertReason.OrderUnfillable, order, metaData });
            } else if (result.traderInfo.makerAllowance.isEqualTo(0)) {
                rejected.push({ message: types_1.RevertReason.Erc20InsufficientAllowance, order, metaData });
            } else if (result.traderInfo.makerBalance.isEqualTo(0)) {
                rejected.push({ message: types_1.RevertReason.Erc20InsufficientBalance, order, metaData });
            } else if (result.traderInfo.makerZrxAllowance.isGreaterThan(0) && order.makerFee.isGreaterThan(0)) {
                rejected.push({ message: types_1.RevertReason.Erc20InsufficientAllowance, order, metaData });
            } else if (result.traderInfo.makerZrxBalance.isGreaterThan(0) && order.makerFee.isGreaterThan(0)) {
                rejected.push({ message: types_1.RevertReason.Erc20InsufficientBalance, order, metaData });
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
    async _validateOrdersAsync(orders) {
        const accepted = [];
        const rejected = [];
        for (const order of orders) {
            const orderHash = _0x_js_1.orderHashUtils.getOrderHashHex(order);
            try {
                d('validating', orderHash);
                await this._contractWrappers.exchange.validateOrderFillableOrThrowAsync(order, {
                    simulationTakerAddress: config_1.DEFAULT_TAKER_SIMULATION_ADDRESS,
                });
                accepted.push({
                    order,
                    message: undefined,
                    // TODO this is not always correct and we should calculate the proper amount
                    metaData: { orderHash, remainingFillableTakerAssetAmount: order.takerAssetAmount },
                });
            } catch (err) {
                rejected.push({
                    order,
                    message: err.message,
                    metaData: { orderHash, remainingFillableTakerAssetAmount: ZERO },
                });
            }
        }
        return { accepted, rejected };
    }
}
exports.OrderWatcherAdapter = OrderWatcherAdapter;
