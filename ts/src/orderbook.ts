import { orderHashUtils, SignedOrder } from '0x.js';
import { APIOrder, OrderbookResponse } from '@0xproject/connect';
import * as _ from 'lodash';

import { paginate } from './paginator';

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
            bids: paginate(bidApiOrders),
            asks: paginate(askApiOrders),
        };
    },
    getOrders: (): APIOrder[] => {
        const apiOrders: APIOrder[] = orders.map(order => ({ metaData: {}, order }));
        return apiOrders;
    },
    getOrderByHashIfExists: (orderHash: string): SignedOrder | undefined => {
        // TODO(leo): Do it smarter
        return _.find(orders, order => orderHashUtils.getOrderHashHex(order) === orderHash);
    },
};
