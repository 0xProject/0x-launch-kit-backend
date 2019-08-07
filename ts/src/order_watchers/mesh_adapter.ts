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
import { getDBConnection } from '../db_connection';
import { MeshEventModel } from '../models/MeshEventModel';
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

interface APIOrdersByState {
    added: APIOrderWithMetaData[];
    removed: APIOrderWithMetaData[];
    updated: APIOrderWithMetaData[];
}
const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        // tslint:disable:no-bitwise one-variable-per-declaration custom-no-magic-numbers
        const r = (Math.random() * 16) | 0,
            v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

export class MeshAdapter {
    private readonly _wsClient: WSClient;
    private readonly _listeners = {
        added: new Set<onOrdersUpdateCallback>(),
        updated: new Set<onOrdersUpdateCallback>(),
        removed: new Set<onOrdersUpdateCallback>(),
    };
    private static _updateListeners(listeners: Set<onOrdersUpdateCallback>, orders: APIOrderWithMetaData[]): void {
        if (orders.length > 0) {
            for (const cb of listeners) {
                cb(orders);
            }
        }
    }
    private static _calculateAddOrRemove(orderEvents: OrderEvent[]): APIOrdersByState {
        const connection = getDBConnection();
        const added = [];
        const removed = [];
        const updated = [];
        const uuid = uuidv4();
        for (const event of orderEvents) {
            connection.manager.save(
                new MeshEventModel({
                    hash: event.orderHash,
                    eventName: event.kind,
                    occuredAt: Date.now().toString(),
                    uuid,
                }),
            );
            const apiOrder = MeshAdapter._orderInfoToAPIOrder(event);
            switch (event.kind) {
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
                case OrderEventKind.FillabilityIncreased:
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
        // RejectedOrderInfo has no fillableTakerAssetAmount, default to 0
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
            MeshAdapter._updateListeners(this._listeners.added, added);
            MeshAdapter._updateListeners(this._listeners.updated, updated);
            MeshAdapter._updateListeners(this._listeners.removed, removed);
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
