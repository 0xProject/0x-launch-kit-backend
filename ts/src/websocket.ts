import { assetDataUtils } from '@0x/order-utils';
import {
    APIOrder,
    AssetProxyId,
    OrdersChannelMessageTypes,
    SignedOrder,
    UpdateOrdersChannelMessage,
    WebsocketConnectionEventType,
} from '@0x/types';
import * as http from 'http';
import * as WebSocket from 'ws';

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

interface OrderChannelRequest {
    type: string;
    channel: MessageChannels;
    requestId: string;
    payload?: OrdersChannelSubscriptionOpts;
}

enum MessageTypes {
    Subscribe = 'subscribe',
}

enum MessageChannels {
    Orders = 'orders',
}
interface UpdateOrdersChannelMessageWithChannel extends UpdateOrdersChannelMessage {
    channel: MessageChannels;
}

interface WrappedWebSocket extends WebSocket {
    isAlive: boolean;
    requestIds: string[];
}

const DEFAULT_OPTS: WebsocketSRAOpts = {
    pongInterval: 30000,
};

type ALL_SUBSCRIPTION_OPTS = 'ALL_SUBSCRIPTION_OPTS';

export class WebsocketSRA {
    private readonly _server: WebSocket.Server;
    private readonly _pongIntervalId: number;
    private readonly _requestIdToSocket: Map<string, WrappedWebSocket> = new Map(); // requestId to WebSocket mapping
    private readonly _requestIdToSubscriptionOpts: Map<
        string,
        OrdersChannelSubscriptionOpts | ALL_SUBSCRIPTION_OPTS
    > = new Map(); // requestId -> { base, quote }
    public static createServer(server: http.Server, opts?: WebsocketSRAOpts): WebsocketSRA {
        return new WebsocketSRA(server, opts);
    }
    constructor(server: http.Server, opts?: WebsocketSRAOpts) {
        const wsOpts = {
            ...DEFAULT_OPTS,
            ...opts,
        };
        this._server = new WebSocket.Server({ server });
        this._server.on('connection', this._processConnection.bind(this));
        this._pongIntervalId = setInterval(this._cleanupConnections.bind(this), wsOpts.pongInterval);
    }
    public destroy(): void {
        clearInterval(this._pongIntervalId);
        for (const ws of this._server.clients) {
            return ws.terminate();
        }
        this._requestIdToSocket.clear();
        this._requestIdToSubscriptionOpts.clear();
        this._server.close();
    }
    public _orderUpdate(apiOrders: APIOrder[]): void {
        const response: Partial<UpdateOrdersChannelMessageWithChannel> = {
            type: OrdersChannelMessageTypes.Update,
            channel: MessageChannels.Orders,
            payload: apiOrders,
        };
        for (const order of apiOrders) {
            for (const [requestId, subscriptionOpts] of this._requestIdToSubscriptionOpts) {
                if (this._matchesOrdersChannelSubscription(order.order, subscriptionOpts)) {
                    const ws = this._requestIdToSocket.get(requestId);
                    if (ws) {
                        ws.send(JSON.stringify({ ...response, payload: [order], requestId }));
                    }
                }
            }
        }
    }
    private _cleanupConnections(): void {
        for (const ws of this._server.clients) {
            if (!(ws as WrappedWebSocket).isAlive) {
                return ws.terminate();
            }
            (ws as WrappedWebSocket).isAlive = false;
            ws.ping();
        }
    }
    private _processConnection(ws: WrappedWebSocket, _req: http.IncomingMessage): void {
        ws.on('pong', this._pongHandler(ws).bind(this));
        ws.on(WebsocketConnectionEventType.Message, this._messageHandler(ws).bind(this));
        ws.on(WebsocketConnectionEventType.Close, this._closeHandler(ws).bind(this));
        ws.isAlive = true;
        ws.requestIds = [];
    }
    // tslint:disable-next-line:prefer-function-over-method
    private _pongHandler(ws: WrappedWebSocket): () => void {
        return () => {
            ws.isAlive = true;
        };
    }
    private _closeHandler(ws: WrappedWebSocket): () => void {
        return () => {
            for (const [requestId] of ws.requestIds) {
                this._requestIdToSocket.delete(requestId);
                this._requestIdToSubscriptionOpts.delete(requestId);
            }
        };
    }
    // tslint:disable-next-line:prefer-function-over-method
    private _messageHandler(ws: WrappedWebSocket): (data: WebSocket.Data) => void {
        return (data: WebSocket.Data) => {
            try {
                this._processMessage(ws, data);
            } catch (err) {
                this._processError(ws, err);
            }
        };
    }
    private _processMessage(ws: WrappedWebSocket, data: WebSocket.Data): void {
        const message: OrderChannelRequest = JSON.parse(data.toString());
        const requestId = message.requestId;
        switch (message.type) {
            case MessageTypes.Subscribe:
                if (!message.payload) {
                    this._requestIdToSubscriptionOpts.set(requestId, 'ALL_SUBSCRIPTION_OPTS');
                    this._requestIdToSocket.set(requestId, ws);
                } else {
                    this._requestIdToSubscriptionOpts.set(requestId, message.payload);
                    this._requestIdToSocket.set(requestId, ws);
                }
                break;
            default:
                throw new Error('Unsupported Message Type');
        }
    }
    // tslint:disable-next-line:prefer-function-over-method
    private _decodedContractAndAssetData(assetData: string): { assetProxyId: string; data: string[] } {
        let data: string[] = [assetData];
        const decodedAssetData = assetDataUtils.decodeAssetDataOrThrow(assetData);
        if (assetDataUtils.isMultiAssetData(decodedAssetData)) {
            for (const nested of decodedAssetData.nestedAssetData) {
                data = [...data, ...this._decodedContractAndAssetData(nested).data];
            }
        } else if (assetDataUtils.isStaticCallAssetData(decodedAssetData)) {
            // do nothing
        } else {
            data = [...data, decodedAssetData.tokenAddress];
        }
        return { data, assetProxyId: decodedAssetData.assetProxyId };
    }
    private _matchesOrdersChannelSubscription(
        order: SignedOrder,
        opts: OrdersChannelSubscriptionOpts | ALL_SUBSCRIPTION_OPTS,
    ): boolean {
        if (opts === 'ALL_SUBSCRIPTION_OPTS') {
            return true;
        }
        const { makerAssetData, takerAssetData } = order;
        const { baseAssetData, quoteAssetData, traderAssetData } = opts;
        // Handle the specific, unambiguous asset datas
        // traderAssetData?: string;
        if (traderAssetData && [makerAssetData, takerAssetData].includes(traderAssetData)) {
            return true;
        }
        // baseAssetData?: string;
        // quoteAssetData?: string;
        if (
            baseAssetData &&
            quoteAssetData &&
            [makerAssetData, takerAssetData].includes(baseAssetData) &&
            [makerAssetData, takerAssetData].includes(quoteAssetData)
        ) {
            return true;
        }
        // makerAssetData?: string;
        // takerAssetData?: string;
        if (
            opts.makerAssetData &&
            opts.takerAssetData &&
            [makerAssetData, takerAssetData].includes(opts.makerAssetData) &&
            [makerAssetData, takerAssetData].includes(opts.takerAssetData)
        ) {
            return true;
        }
        // makerAssetAddress?: string;
        // takerAssetAddress?: string;
        const makerContractAndAssetData = this._decodedContractAndAssetData(makerAssetData);
        const takerContractAndAssetData = this._decodedContractAndAssetData(takerAssetData);
        if (
            opts.makerAssetAddress &&
            opts.takerAssetAddress &&
            makerContractAndAssetData.assetProxyId !== AssetProxyId.MultiAsset &&
            makerContractAndAssetData.assetProxyId !== AssetProxyId.StaticCall &&
            takerContractAndAssetData.assetProxyId !== AssetProxyId.MultiAsset &&
            takerContractAndAssetData.assetProxyId !== AssetProxyId.StaticCall &&
            makerContractAndAssetData.data.includes(opts.makerAssetAddress) &&
            takerContractAndAssetData.data.includes(opts.takerAssetAddress)
        ) {
            return true;
        }

        // TODO handle MAP
        // TODO
        // makerAssetProxyId?: string;
        // takerAssetProxyId?: string;
        return false;
    }
    // tslint:disable-next-line:prefer-function-over-method
    private _processError(ws: WrappedWebSocket, err: Error): void {
        ws.send(err.message);
        ws.terminate();
    }
}
