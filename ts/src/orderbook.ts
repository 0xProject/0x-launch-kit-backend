import { SignedOrder } from '0x.js';
import { APIOrder, OrderbookResponse } from '@0xproject/connect';

// Global state
const orders: SignedOrder[] = [];

export const orderBook = {
    addOrder: (signedOrder: SignedOrder) => {
        orders.push(signedOrder);
    },
    getOrderBook: (baseAssetData: string, quoteAssetData: string): OrderbookResponse => {
        const bidOrders = orders.filter(
            order => order.takerAssetData === baseAssetData && order.makerAssetData === quoteAssetData,
        );
        const askOrders = orders.filter(
            order => order.takerAssetData === quoteAssetData && order.makerAssetData === baseAssetData,
        );
        const bidApiOrders: APIOrder[] = bidOrders.map(order => ({ metaData: {}, order }));
        const askApiOrders: APIOrder[] = askOrders.map(order => ({ metaData: {}, order }));

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
    getOrders: (): APIOrder[] => {
        const apiOrders: APIOrder[] = orders.map(order => ({ metaData: {}, order }));
        return apiOrders;
    },
};
