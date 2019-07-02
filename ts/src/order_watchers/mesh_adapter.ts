import { BigNumber, SignedOrder } from '0x.js';
import {
    AcceptedOrderInfo,
    OrderEvent,
    OrderEventKind,
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

export class MeshAdapter {
    private readonly _wsClient: WSClient;
    private static _calculateAddOrRemove(
        orderEvents: OrderEvent[],
    ): { added: APIOrderWithMetaData[]; removed: APIOrderWithMetaData[] } {
        const added = [];
        const removed = [];
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
                    break;
                }
                default:
                    d('Unknown Event', event.kind, event);
                    break;
            }
        }
        return { added, removed };
    }
    private static _orderInfoToAPIOrder(
        orderEvent: OrderEvent | AcceptedOrderInfo | RejectedOrderInfo,
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
        await utils.attemptAsync(() =>
            this._wsClient.subscribeToOrdersAsync((orderEvents: OrderEvent[]) => {
                const { added } = MeshAdapter._calculateAddOrRemove(orderEvents);
                if (added.length > 0) {
                    cb(added);
                }
            }),
        );
    }
    // tslint:disable-next-line:async-suffix
    public async onOrdersRemoved(cb: onOrdersUpdateCallback): Promise<void> {
        await utils.attemptAsync(() =>
            this._wsClient.subscribeToOrdersAsync((orderEvents: OrderEvent[]) => {
                const { removed } = MeshAdapter._calculateAddOrRemove(orderEvents);
                if (removed.length > 0) {
                    cb(removed);
                }
            }),
        );
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
        const validationResults = await utils.attemptAsync(() => this._wsClient.addOrdersAsync(signedOrders));
        return validationResults;
    }
}
