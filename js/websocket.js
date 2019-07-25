'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const order_utils_1 = require('@0x/order-utils');
const types_1 = require('@0x/types');
const WebSocket = require('ws');
var MessageTypes;
(function(MessageTypes) {
    MessageTypes['Subscribe'] = 'subscribe';
})(MessageTypes || (MessageTypes = {}));
var MessageChannels;
(function(MessageChannels) {
    MessageChannels['Orders'] = 'orders';
})(MessageChannels || (MessageChannels = {}));
const DEFAULT_OPTS = {
    pongInterval: 30000,
};
class WebsocketSRA {
    constructor(server, opts) {
        this._requestIdToSocket = new Map(); // requestId to WebSocket mapping
        this._requestIdToSubscriptionOpts = new Map(); // requestId -> { base, quote }
        const wsOpts = {
            ...DEFAULT_OPTS,
            ...opts,
        };
        this._server = new WebSocket.Server({ server });
        this._server.on('connection', this._processConnection.bind(this));
        this._pongIntervalId = setInterval(this._cleanupConnections.bind(this), wsOpts.pongInterval);
    }
    static createServer(server, opts) {
        return new WebsocketSRA(server, opts);
    }
    destroy() {
        clearInterval(this._pongIntervalId);
        for (const ws of this._server.clients) {
            return ws.terminate();
        }
        this._requestIdToSocket.clear();
        this._requestIdToSubscriptionOpts.clear();
        this._server.close();
    }
    _orderUpdate(apiOrders) {
        const response = {
            type: types_1.OrdersChannelMessageTypes.Update,
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
    _cleanupConnections() {
        for (const ws of this._server.clients) {
            if (!ws.isAlive) {
                return ws.terminate();
            }
            ws.isAlive = false;
            ws.ping();
        }
    }
    _processConnection(ws, _req) {
        ws.on('pong', this._pongHandler(ws).bind(this));
        ws.on(types_1.WebsocketConnectionEventType.Message, this._messageHandler(ws).bind(this));
        ws.on(types_1.WebsocketConnectionEventType.Close, this._closeHandler(ws).bind(this));
        ws.isAlive = true;
        ws.requestIds = [];
    }
    // tslint:disable-next-line:prefer-function-over-method
    _pongHandler(ws) {
        return () => {
            ws.isAlive = true;
        };
    }
    _closeHandler(ws) {
        return () => {
            for (const [requestId] of ws.requestIds) {
                this._requestIdToSocket.delete(requestId);
                this._requestIdToSubscriptionOpts.delete(requestId);
            }
        };
    }
    // tslint:disable-next-line:prefer-function-over-method
    _messageHandler(ws) {
        return data => {
            try {
                this._processMessage(ws, data);
            } catch (err) {
                this._processError(ws, err);
            }
        };
    }
    _processMessage(ws, data) {
        const message = JSON.parse(data.toString());
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
    _decodedContractAndAssetData(assetData) {
        let data = [assetData];
        const decodedAssetData = order_utils_1.assetDataUtils.decodeAssetDataOrThrow(assetData);
        if (order_utils_1.assetDataUtils.isMultiAssetData(decodedAssetData)) {
            for (const nested of decodedAssetData.nestedAssetData) {
                data = [...data, ...this._decodedContractAndAssetData(nested).data];
            }
        } else if (order_utils_1.assetDataUtils.isStaticCallAssetData(decodedAssetData)) {
            // do nothing
        } else {
            data = [...data, decodedAssetData.tokenAddress];
        }
        return { data, assetProxyId: decodedAssetData.assetProxyId };
    }
    _matchesOrdersChannelSubscription(order, opts) {
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
            makerContractAndAssetData.assetProxyId !== types_1.AssetProxyId.MultiAsset &&
            makerContractAndAssetData.assetProxyId !== types_1.AssetProxyId.StaticCall &&
            takerContractAndAssetData.assetProxyId !== types_1.AssetProxyId.MultiAsset &&
            takerContractAndAssetData.assetProxyId !== types_1.AssetProxyId.StaticCall &&
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
    _processError(ws, err) {
        ws.send(err.message);
        ws.terminate();
    }
}
exports.WebsocketSRA = WebsocketSRA;
