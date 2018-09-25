import { BigNumber, SignedOrder } from '0x.js';
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';
import * as _ from 'lodash';

import { AssetPairsStore } from './asset_pairs_store';
import { ASSET_PAIRS, FEE_RECIPIENTS, NETWORK_ID } from './config';
import { NULL_ADDRESS } from './constants';
import { orderBook } from './orderbook';
import { paginate } from './paginator';
import { utils } from './utils';

const assetPairsStore = new AssetPairsStore(ASSET_PAIRS);

// TODO(leo): Set proper json headers
// TODO(leo): Perform JSON schema validation on both request and response
export const handlers = {
    assetPairs: (req: express.Request, res: express.Response) => {
        const assetPairs = assetPairsStore.get(req.query.assetDataA, req.query.assetDataB);
        const paginatedAssetPairs = paginate(assetPairs);
        res.status(HttpStatus.OK).send(paginatedAssetPairs);
    },
    orders: (_req: express.Request, res: express.Response) => {
        const orders = orderBook.getOrders();
        const paginatedOrders = paginate(orders);
        res.status(HttpStatus.OK).send(paginatedOrders);
    },
    feeRecipients: (_req: express.Request, res: express.Response) => {
        const paginatedFeeRecipients = paginate(FEE_RECIPIENTS);
        res.status(HttpStatus.OK).send(paginatedFeeRecipients);
    },
    orderbook: (req: express.Request, res: express.Response) => {
        const baseAssetData = req.query.baseAssetData;
        const quoteAssetData = req.query.quoteAssetData;
        const networkId = parseNetworkId(req.query.networkId);
        if (networkId !== NETWORK_ID) {
            utils.log(`Incorrect Network ID: ${networkId}`);
            res.status(HttpStatus.BAD_REQUEST).send();
        } else {
            const orderbookResponse = orderBook.getOrderBook(baseAssetData, quoteAssetData);
            res.status(HttpStatus.OK).send(orderbookResponse);
        }
    },
    orderConfig: (req: express.Request, res: express.Response) => {
        const networkId = parseNetworkId(req.query.networkId);
        if (networkId !== NETWORK_ID) {
            utils.log(`Incorrect Network ID: ${networkId}`);
            res.status(HttpStatus.BAD_REQUEST).send();
        } else {
            const orderConfigResponse = {
                senderAddress: NULL_ADDRESS,
                feeRecipientAddress: NULL_ADDRESS,
                makerFee: 0,
                takerFee: '1000',
            };
            res.status(HttpStatus.OK).send(orderConfigResponse);
        }
    },
    postOrder: (req: express.Request, res: express.Response) => {
        const networkId = parseNetworkId(req.query.networkId);
        if (networkId !== NETWORK_ID) {
            utils.log(`Incorrect Network ID: ${networkId}`);
            res.status(HttpStatus.BAD_REQUEST).send();
        } else {
            const signedOrder = unmarshallOrder(req.body);
            orderBook.addOrder(signedOrder);
            res.status(HttpStatus.OK).send();
        }
    },
    getOrderByHash: (_req: express.Request, res: express.Response) => {
        const orderIfExists = orderBook.getOrderByHashIfExists(_req.params.orderHash);
        if (_.isUndefined(orderIfExists)) {
            res.status(HttpStatus.NOT_FOUND).send();
        } else {
            res.status(HttpStatus.OK).send(orderIfExists);
        }
    },
};

// TODO(leo): Throw if networkId is unsupported
function parseNetworkId(networkIdStrIfExists?: string): number {
    if (_.isUndefined(networkIdStrIfExists)) {
        return NETWORK_ID;
    } else {
        const networkId = _.parseInt(networkIdStrIfExists);
        return networkId;
    }
}

// As the orders come in as JSON they need to be turned into the correct types such as BigNumber
function unmarshallOrder(signedOrderRaw: any): SignedOrder {
    const signedOrder = {
        ...signedOrderRaw,
        salt: new BigNumber(signedOrderRaw.salt),
        makerAssetAmount: new BigNumber(signedOrderRaw.makerAssetAmount),
        takerAssetAmount: new BigNumber(signedOrderRaw.takerAssetAmount),
        makerFee: new BigNumber(signedOrderRaw.makerFee),
        takerFee: new BigNumber(signedOrderRaw.takerFee),
        expirationTimeSeconds: new BigNumber(signedOrderRaw.expirationTimeSeconds),
    };
    return signedOrder;
}
