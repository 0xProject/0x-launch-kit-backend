import { WSClient } from '@0x/mesh-rpc-client';
import * as _ from 'lodash';

import { getDBConnection } from '../db_connection';
import { MeshUtils } from '../mesh_utils';
import { MeshEventModel } from '../models/MeshEventModel';
import { SignedOrderModel } from '../models/SignedOrderModel';
import { APIOrderWithMetaData, OrderWatcherLifeCycleEvents } from '../types';

import { deserializeOrder, serializeOrder } from './orderbook_utils';

const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        // tslint:disable:no-bitwise one-variable-per-declaration custom-no-magic-numbers
        const r = (Math.random() * 16) | 0,
            v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};
// tslint:disable-next-line:no-var-requires
const d = require('debug')('orderbook');

export class OrderWatcherService {
    private readonly _meshClient: WSClient;
    private static async _onOrderLifeCycleEventAsync(
        lifecycleEvent: OrderWatcherLifeCycleEvents,
        orders: APIOrderWithMetaData[],
    ): Promise<void> {
        if (orders.length <= 0) {
            return;
        }
        const connection = getDBConnection();
        switch (lifecycleEvent) {
            case OrderWatcherLifeCycleEvents.Updated:
            case OrderWatcherLifeCycleEvents.Added: {
                const signedOrdersModel = orders.map(o => serializeOrder(o));
                // MAX SQL variable size is 999. This limit is imposed via Sqlite.
                // The SELECT query is not entirely effecient and pulls in all attributes
                // so we need to leave space for the attributes on the model represented
                // as SQL variables in the "AS" syntax. We leave 99 free for the
                // signedOrders model
                await connection.manager.save(signedOrdersModel, { chunk: 900 });
                break;
            }
            case OrderWatcherLifeCycleEvents.Removed: {
                const orderHashes = orders.map(o => o.metaData.orderHash);
                // MAX SQL variable size is 999. This limit is imposed via Sqlite
                // and other databases have higher limits (or no limits at all, eg postgresql)
                // tslint:disable-next-line:custom-no-magic-numbers
                const chunks = _.chunk(orderHashes, 999);
                for (const chunk of chunks) {
                    await connection.manager.delete(SignedOrderModel, chunk);
                }
                break;
            }
            default:
            // Do Nothing
        }
    }
    constructor(meshClient: WSClient) {
        this._meshClient = meshClient;
        void this._meshClient.subscribeToOrdersAsync(async orders => {
            const connection = getDBConnection();
            const uuid = uuidv4();
            for (const order of orders) {
                connection.manager.save(
                    new MeshEventModel({
                        hash: order.orderHash,
                        eventName: order.endState,
                        occuredAt: Date.now().toString(),
                        uuid,
                    }),
                );
            }
            const { added, removed, updated } = MeshUtils.calculateAddedRemovedUpdated(orders);
            await OrderWatcherService._onOrderLifeCycleEventAsync(OrderWatcherLifeCycleEvents.Removed, removed);
            await OrderWatcherService._onOrderLifeCycleEventAsync(OrderWatcherLifeCycleEvents.Updated, updated);
            await OrderWatcherService._onOrderLifeCycleEventAsync(OrderWatcherLifeCycleEvents.Added, added);
        });
        this._meshClient.onReconnected(async () => {
            d('Reconnecting to Mesh');
            await this.syncOrderbookAsync();
        });
    }
    public async syncOrderbookAsync(): Promise<void> {
        d('SYNC orderbook with Mesh');
        const connection = getDBConnection();
        const signedOrderModels = (await connection.manager.find(SignedOrderModel)) as Array<
            Required<SignedOrderModel>
        >;
        const signedOrders = signedOrderModels.map(deserializeOrder);
        // Sync the order watching service state locally
        const orders = await this._meshClient.getOrdersAsync();
        // TODO(dekz): Mesh can reject due to InternalError or EthRPCRequestFailed.
        // in the future we can attempt to retry these a few times. Ultimately if we
        // cannot validate the order we cannot keep the order around
        // Validate the local state and notify the order watcher of any missed orders
        const { accepted, rejected } = await MeshUtils.addOrdersToMeshAsync(this._meshClient, signedOrders);
        d(`SYNC ${rejected.length} rejected ${accepted.length} accepted ${signedOrders.length} sent`);
        // Remove all of the rejected orders
        if (rejected.length > 0) {
            await OrderWatcherService._onOrderLifeCycleEventAsync(
                OrderWatcherLifeCycleEvents.Removed,
                MeshUtils.orderInfosToApiOrders(rejected),
            );
        }
        // Sync the order watching service state locally
        if (orders.length > 0) {
            await OrderWatcherService._onOrderLifeCycleEventAsync(
                OrderWatcherLifeCycleEvents.Added,
                MeshUtils.orderInfosToApiOrders(orders),
            );
        }
        d('SYNC complete');
    }
}
