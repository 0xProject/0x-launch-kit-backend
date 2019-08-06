import { BigNumber } from '0x.js';
import { APIOrder, SignedOrder, UpdateOrdersChannelMessage } from '@0x/types';

export enum OrderWatcherLifeCycleEvents {
    Added,
    Removed,
    Updated,
}

export type onOrdersUpdateCallback = (orders: APIOrderWithMetaData[]) => void;

export interface AdaptedOrderAndValidationResult {
    order: SignedOrder;
    message: string | undefined;
    metaData: APIOrderMetaData;
}

export interface AdaptedValidationResults {
    accepted: AdaptedOrderAndValidationResult[];
    rejected: AdaptedOrderAndValidationResult[];
}

export interface APIOrderMetaData {
    orderHash: string;
    remainingFillableTakerAssetAmount: BigNumber;
}

export interface APIOrderWithMetaData extends APIOrder {
    metaData: APIOrderMetaData;
}

export interface WebsocketSRAOpts {
    pongInterval?: number;
}

export interface OrdersChannelSubscriptionOpts {
    baseAssetData?: string;
    quoteAssetData?: string;
    makerAssetProxyId?: string;
    takerAssetProxyId?: string;
    makerAssetAddress?: string;
    takerAssetAddress?: string;
    makerAssetData?: string;
    takerAssetData?: string;
    traderAssetData?: string;
    networkId?: number;
}

export interface OrderChannelRequest {
    type: string;
    channel: MessageChannels;
    requestId: string;
    payload?: OrdersChannelSubscriptionOpts;
}

export enum MessageTypes {
    Subscribe = 'subscribe',
}

export enum MessageChannels {
    Orders = 'orders',
}
export interface UpdateOrdersChannelMessageWithChannel extends UpdateOrdersChannelMessage {
    channel: MessageChannels;
}
