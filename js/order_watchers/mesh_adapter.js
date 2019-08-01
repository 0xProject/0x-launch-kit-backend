'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const _0x_js_1 = require('0x.js');
const dekz_mesh_rpc_client_1 = require('dekz-mesh-rpc-client');
const _ = require('lodash');
const config_1 = require('../config');
const utils_1 = require('../utils');
// tslint:disable-next-line:no-var-requires
const d = require('debug')('MESH');
const ZERO = new _0x_js_1.BigNumber(0);
const ADD_ORDER_BATCH_SIZE = 100;
class MeshAdapter {
    static _calculateAddOrRemove(orderEvents) {
        const added = [];
        const removed = [];
        for (const event of orderEvents) {
            const apiOrder = MeshAdapter._orderInfoToAPIOrder(event);
            switch (event.kind) {
                case dekz_mesh_rpc_client_1.OrderEventKind.FillabilityIncreased:
                case dekz_mesh_rpc_client_1.OrderEventKind.Added: {
                    added.push(apiOrder);
                    break;
                }
                case dekz_mesh_rpc_client_1.OrderEventKind.Cancelled:
                case dekz_mesh_rpc_client_1.OrderEventKind.Expired:
                case dekz_mesh_rpc_client_1.OrderEventKind.FullyFilled:
                case dekz_mesh_rpc_client_1.OrderEventKind.Unfunded: {
                    removed.push(apiOrder);
                    break;
                }
                case dekz_mesh_rpc_client_1.OrderEventKind.Filled: {
                    break;
                }
                default:
                    d('Unknown Event', event.kind, event);
                    break;
            }
        }
        return { added, removed };
    }
    static _orderInfoToAPIOrder(orderEvent) {
        const remainingFillableTakerAssetAmount = orderEvent.fillableTakerAssetAmount
            ? orderEvent.fillableTakerAssetAmount
            : ZERO;
        return {
            order: orderEvent.signedOrder,
            metaData: {
                orderHash: orderEvent.orderHash,
                remainingFillableTakerAssetAmount,
            },
        };
    }
    constructor() {
        this._wsClient = new dekz_mesh_rpc_client_1.WSClient(config_1.MESH_ENDPOINT);
    }
    async addOrdersAsync(orders) {
        if (orders.length === 0) {
            const validationResults = { accepted: [], rejected: [] };
            return validationResults;
        }
        const { accepted, rejected } = await this._submitOrdersToMeshAsync(orders);
        const adaptedAcceptedResults = (accepted || []).map(r => ({
            ...MeshAdapter._orderInfoToAPIOrder(r),
            message: undefined,
        }));
        const adaptedRejectedResults = (rejected || []).map(r => ({
            ...MeshAdapter._orderInfoToAPIOrder(r),
            message: `${r.kind} ${r.status.code}: ${r.status.message}`,
        }));
        return { accepted: adaptedAcceptedResults, rejected: adaptedRejectedResults };
    }
    // tslint:disable-next-line:async-suffix
    async onOrdersAdded(cb) {
        await utils_1.utils.attemptAsync(() =>
            this._wsClient.subscribeToOrdersAsync(orderEvents => {
                const { added } = MeshAdapter._calculateAddOrRemove(orderEvents);
                if (added.length > 0) {
                    cb(added);
                }
            }),
        );
    }
    // tslint:disable-next-line:async-suffix
    async onOrdersRemoved(cb) {
        await utils_1.utils.attemptAsync(() =>
            this._wsClient.subscribeToOrdersAsync(orderEvents => {
                const { removed } = MeshAdapter._calculateAddOrRemove(orderEvents);
                if (removed.length > 0) {
                    cb(removed);
                }
            }),
        );
    }
    onReconnected(cb) {
        this._wsClient.onReconnected(() => cb());
    }
    async getOrdersAsync() {
        const acceptedOrders = await utils_1.utils.attemptAsync(() => this._wsClient.getOrdersAsync());
        const orders = acceptedOrders.map(o => MeshAdapter._orderInfoToAPIOrder(o));
        return orders;
    }
    async _submitOrdersToMeshAsync(signedOrders) {
        const chunks = _.chunk(signedOrders, ADD_ORDER_BATCH_SIZE);
        let allValidationResults = { accepted: [], rejected: [] };
        for (const chunk of chunks) {
            const validationResults = await utils_1.utils.attemptAsync(() => this._wsClient.addOrdersAsync(chunk));
            allValidationResults = {
                accepted: [...allValidationResults.accepted, ...validationResults.accepted],
                rejected: [...allValidationResults.rejected, ...validationResults.rejected],
            };
        }
        return allValidationResults;
    }
}
exports.MeshAdapter = MeshAdapter;
