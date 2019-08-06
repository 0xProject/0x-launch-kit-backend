import { BigNumber, SignedOrder } from '0x.js';
import {
    AcceptedOrderInfo,
    OrderEvent,
    OrderEventKind,
    OrderInfo,
    RejectedOrderInfo,
    ValidationResults,
    WSClient,
} from 'dekz-mesh-rpc-client';
import * as _ from 'lodash';

import { MESH_ENDPOINT } from '../config';
import {
    AdaptedOrderAndValidationResult,
    AdaptedValidationResults,
    APIOrderWithMetaData,
    onOrdersUpdateCallback,
} from '../types';
import { utils } from '../utils';

// tslint:disable-next-line:no-var-requires
const d = require('debug')('MESH');

const ZERO = new BigNumber(0);
const ADD_ORDER_BATCH_SIZE = 100;

export class MeshAdapter {
    private readonly _wsClient: WSClient;
    private readonly _listeners = {
        added: new Set<onOrdersUpdateCallback>(),
        updated: new Set<onOrdersUpdateCallback>(),
        removed: new Set<onOrdersUpdateCallback>(),
    };
    private static _calculateAddOrRemove(
        orderEvents: OrderEvent[],
    ): { added: APIOrderWithMetaData[]; removed: APIOrderWithMetaData[]; updated: APIOrderWithMetaData[] } {
        const added = [];
        const removed = [];
        const updated = [];
        for (const event of orderEvents) {
            const apiOrder = MeshAdapter._orderInfoToAPIOrder(event);
            switch (event.kind) {
                case OrderEventKind.FillabilityIncreased:
                case OrderEventKind.Added: {
                    added.push(apiOrder);
                    break;
                }
                case OrderEventKind.Cancelled:
                case OrderEventKind.Expired:
                case OrderEventKind.FullyFilled:
                case OrderEventKind.Unfunded: {
                    removed.push(apiOrder);
                    break;
                }
                case OrderEventKind.Filled: {
                    updated.push(apiOrder);
                    break;
                }
                default:
                    d('Unknown Event', event.kind, event);
                    break;
            }
        }
        return { added, removed, updated };
    }
    private static _orderInfoToAPIOrder(
        orderEvent: OrderEvent | AcceptedOrderInfo | RejectedOrderInfo | OrderInfo,
    ): APIOrderWithMetaData {
        const remainingFillableTakerAssetAmount = (orderEvent as OrderEvent).fillableTakerAssetAmount
            ? (orderEvent as OrderEvent).fillableTakerAssetAmount
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
        this._wsClient = new WSClient(MESH_ENDPOINT);
        this._wsClient.subscribeToOrdersAsync(orderEvents => {
            const { added, updated, removed } = MeshAdapter._calculateAddOrRemove(orderEvents);
            if (added.length > 0) {
                for (const cb of this._listeners.added) {
                    cb(added);
                }
            }
            if (removed.length > 0) {
                for (const cb of this._listeners.removed) {
                    cb(removed);
                }
            }
            if (updated.length > 0) {
                for (const cb of this._listeners.updated) {
                    cb(updated);
                }
            }
        });
    }
    public async addOrdersAsync(orders: SignedOrder[]): Promise<AdaptedValidationResults> {
        if (orders.length === 0) {
            const validationResults: AdaptedValidationResults = { accepted: [], rejected: [] };
            return validationResults;
        }
        const { accepted, rejected } = await this._submitOrdersToMeshAsync(orders);
        const adaptedAcceptedResults: AdaptedOrderAndValidationResult[] = (accepted || []).map(r => ({
            ...MeshAdapter._orderInfoToAPIOrder(r),
            message: undefined,
        }));
        const adaptedRejectedResults: AdaptedOrderAndValidationResult[] = (rejected || []).map(r => ({
            ...MeshAdapter._orderInfoToAPIOrder(r),
            message: `${r.kind} ${r.status.code}: ${r.status.message}`,
        }));
        return { accepted: adaptedAcceptedResults, rejected: adaptedRejectedResults };
    }
    // tslint:disable-next-line:async-suffix
    public async onOrdersAdded(cb: onOrdersUpdateCallback): Promise<void> {
        this._listeners.added.add(cb);
    }
    // tslint:disable-next-line:async-suffix
    public async onOrdersUpdated(cb: onOrdersUpdateCallback): Promise<void> {
        this._listeners.updated.add(cb);
    }
    // tslint:disable-next-line:async-suffix
    public async onOrdersRemoved(cb: onOrdersUpdateCallback): Promise<void> {
        this._listeners.removed.add(cb);
    }
    public onReconnected(cb: () => void): void {
        this._wsClient.onReconnected(() => cb());
    }
    public async getOrdersAsync(): Promise<APIOrderWithMetaData[]> {
        const acceptedOrders = await utils.attemptAsync(() => this._wsClient.getOrdersAsync());
        const orders = acceptedOrders.map(o => MeshAdapter._orderInfoToAPIOrder(o));
        return orders;
    }
    private async _submitOrdersToMeshAsync(signedOrders: SignedOrder[]): Promise<ValidationResults> {
        const chunks = _.chunk(signedOrders, ADD_ORDER_BATCH_SIZE);
        let allValidationResults: ValidationResults = { accepted: [], rejected: [] };
        for (const chunk of chunks) {
            d('MESH SEND', chunk.length);
            const validationResults = await utils.attemptAsync(() => this._wsClient.addOrdersAsync(chunk));
            allValidationResults = {
                accepted: [...allValidationResults.accepted, ...validationResults.accepted],
                rejected: [...allValidationResults.rejected, ...validationResults.rejected],
            };
        }
        return allValidationResults;
    }
}
