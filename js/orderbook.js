'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const _0x_js_1 = require('0x.js');
const _ = require('lodash');
const paginator_1 = require('./paginator');
// Global state
const orders = [];
exports.orderBook = {
    addOrder: signedOrder => {
        orders.push(signedOrder);
    },
    getOrderBook: (baseAssetData, quoteAssetData) => {
        const bidOrders = orders.filter(
            order => order.takerAssetData === baseAssetData && order.makerAssetData === quoteAssetData,
        );
        const askOrders = orders.filter(
            order => order.takerAssetData === quoteAssetData && order.makerAssetData === baseAssetData,
        );
        const bidApiOrders = bidOrders.map(order => ({ metaData: {}, order }));
        const askApiOrders = askOrders.map(order => ({ metaData: {}, order }));
        return {
            bids: paginator_1.paginate(bidApiOrders),
            asks: paginator_1.paginate(askApiOrders),
        };
    },
    getOrders: () => {
        const apiOrders = orders.map(order => ({ metaData: {}, order }));
        return apiOrders;
    },
    getOrderByHashIfExists: orderHash => {
        // TODO(leo): Do it smarter
        return _.find(orders, order => _0x_js_1.orderHashUtils.getOrderHashHex(order) === orderHash);
    },
};
