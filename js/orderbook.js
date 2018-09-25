"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _0x_js_1 = require("0x.js");
// Global state
const orders = [];
const ordersByHash = {};
exports.orderBook = {
    addOrder: (signedOrder) => {
        const orderHash = _0x_js_1.orderHashUtils.getOrderHashHex(signedOrder);
        ordersByHash[orderHash] = signedOrder;
        orders.push(signedOrder);
    },
    get: (baseAssetData, quoteAssetData) => {
        const bidOrders = orders.filter(order => order.takerAssetData === baseAssetData && order.makerAssetData === quoteAssetData);
        const askOrders = orders.filter(order => order.takerAssetData === quoteAssetData && order.makerAssetData === baseAssetData);
        const bidApiOrders = bidOrders.map(order => ({ metaData: {}, order }));
        const askApiOrders = askOrders.map(order => ({ metaData: {}, order }));
        return {
            bids: {
                records: bidApiOrders,
                page: 1,
                perPage: 100,
                total: bidOrders.length,
            },
            asks: {
                records: askApiOrders,
                page: 1,
                perPage: 100,
                total: askOrders.length,
            },
        };
    },
};
