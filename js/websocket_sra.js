'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const json_schemas_1 = require('@0x/json-schemas');
const order_utils_1 = require('@0x/order-utils');
const types_1 = require('@0x/types');
const WebSocket = require('ws');
const errors_1 = require('./errors');
const error_handling_1 = require('./middleware/error_handling');
const utils_1 = require('./utils');
var MessageTypes;
(function(MessageTypes) {
    MessageTypes['Subscribe'] = 'subscribe';
})(MessageTypes || (MessageTypes = {}));
var MessageChannels;
(function(MessageChannels) {
    MessageChannels['Orders'] = 'orders';
})(MessageChannels || (MessageChannels = {}));
const DEFAULT_OPTS = {
    pongInterval: 5000,
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
    static _decodedContractAndAssetData(assetData) {
        let data = [assetData];
        const decodedAssetData = order_utils_1.assetDataUtils.decodeAssetDataOrThrow(assetData);
        if (order_utils_1.assetDataUtils.isMultiAssetData(decodedAssetData)) {
            for (const nested of decodedAssetData.nestedAssetData) {
                data = [...data, ...WebsocketSRA._decodedContractAndAssetData(nested).data];
            }
        } else if (order_utils_1.assetDataUtils.isStaticCallAssetData(decodedAssetData)) {
            // do nothing
        } else {
            data = [...data, decodedAssetData.tokenAddress];
        }
        return { data, assetProxyId: decodedAssetData.assetProxyId };
    }
    static _matchesOrdersChannelSubscription(order, opts) {
        if (opts === 'ALL_SUBSCRIPTION_OPTS') {
            return true;
        }
        const { makerAssetData, takerAssetData } = order;
        // Handle the specific, unambiguous asset datas
        // traderAssetData?: string;
        if (opts.traderAssetData && [makerAssetData, takerAssetData].includes(opts.traderAssetData)) {
            return true;
        }
        // baseAssetData?: string;
        // quoteAssetData?: string;
        if (
            opts.baseAssetData &&
            opts.quoteAssetData &&
            [makerAssetData, takerAssetData].includes(opts.baseAssetData) &&
            [makerAssetData, takerAssetData].includes(opts.quoteAssetData)
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
        const makerContractAndAssetData = WebsocketSRA._decodedContractAndAssetData(makerAssetData);
        const takerContractAndAssetData = WebsocketSRA._decodedContractAndAssetData(takerAssetData);
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
        // TODO (dekz)handle MAP
        // makerAssetProxyId?: string;
        // takerAssetProxyId?: string;
        return false;
    }
    destroy() {
        clearInterval(this._pongIntervalId);
        for (const ws of this._server.clients) {
            ws.terminate();
        }
        this._requestIdToSocket.clear();
        this._requestIdToSubscriptionOpts.clear();
        this._server.close();
    }
    orderUpdate(apiOrders) {
        const response = {
            type: types_1.OrdersChannelMessageTypes.Update,
            channel: MessageChannels.Orders,
            payload: apiOrders,
        };
        for (const order of apiOrders) {
            const requestIdToOrders = {};
            for (const [requestId, subscriptionOpts] of this._requestIdToSubscriptionOpts) {
                if (WebsocketSRA._matchesOrdersChannelSubscription(order.order, subscriptionOpts)) {
                    requestIdToOrders[requestId] = requestIdToOrders[requestId]
                        ? [...requestIdToOrders[requestId], order]
                        : [order];
                }
            }
            for (const [requestId, orders] of Object.entries(requestIdToOrders)) {
                const ws = this._requestIdToSocket.get(requestId);
                if (ws) {
                    ws.send(JSON.stringify({ ...response, payload: orders, requestId }));
                }
            }
        }
    }
    _processConnection(ws, _req) {
        ws.on('pong', this._pongHandler(ws).bind(this));
        ws.on(types_1.WebsocketConnectionEventType.Message, this._messageHandler(ws).bind(this));
        ws.on(types_1.WebsocketConnectionEventType.Close, this._closeHandler(ws).bind(this));
        ws.isAlive = true;
        ws.requestIds = [];
    }
    _processMessage(ws, data) {
        let message;
        try {
            message = JSON.parse(data.toString());
        } catch (e) {
            throw new errors_1.MalformedJSONError();
        }
        utils_1.utils.validateSchema(message, json_schemas_1.schemas.relayerApiOrdersChannelSubscribeSchema);
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
                throw new errors_1.NotImplementedError(message.type);
        }
    }
    _cleanupConnections() {
        // Ping every connection and if it is unresponsive
        // terminate it during the next check
        for (const ws of this._server.clients) {
            if (!ws.isAlive) {
                ws.terminate();
            } else {
                ws.isAlive = false;
                ws.ping();
            }
        }
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
    // tslint:disable-next-line:prefer-function-over-method
    _processError(ws, err) {
        const { errorBody } = error_handling_1.generateError(err);
        ws.send(JSON.stringify(errorBody));
        ws.terminate();
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
}
exports.WebsocketSRA = WebsocketSRA;
