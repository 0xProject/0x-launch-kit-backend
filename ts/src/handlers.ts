import { BigNumber, SignedOrder } from '0x.js';
import * as express from 'express';
import * as _ from 'lodash';

import { orderBook } from './orderbook';
import { utils } from './utils';

const GANACHE_NETWORK_ID = 50;
const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
const HTTP_OK_STATUS = 200;
const HTTP_BAD_REQUEST_STATUS = 400;

export const handlers = {
    orderbook: (req: express.Request, res: express.Response) => {
        utils.log('HTTP: GET orderbook');
        const baseAssetData = req.query.baseAssetData;
        const quoteAssetData = req.query.quoteAssetData;
        const networkId = parseNetworkId(req.query.networkId);
        if (networkId !== GANACHE_NETWORK_ID) {
            utils.log(`Incorrect Network ID: ${networkId}`);
            res.status(HTTP_BAD_REQUEST_STATUS).send({});
        } else {
            const orderbookResponse = orderBook.get(baseAssetData, quoteAssetData);
            res.status(HTTP_OK_STATUS).send(orderbookResponse);
        }
    },
    orderConfig: (req: express.Request, res: express.Response) => {
        utils.log('HTTP: GET order config');
        const networkId = parseNetworkId(req.query.networkId);
        if (networkId !== GANACHE_NETWORK_ID) {
            utils.log(`Incorrect Network ID: ${networkId}`);
            res.status(HTTP_BAD_REQUEST_STATUS).send({});
        } else {
            const orderConfigResponse = {
                senderAddress: NULL_ADDRESS,
                feeRecipientAddress: NULL_ADDRESS,
                makerFee: 0,
                takerFee: '1000',
            };
            res.status(HTTP_OK_STATUS).send(orderConfigResponse);
        }
    },
    order: (req: express.Request, res: express.Response) => {
        utils.log('HTTP: POST order');
        const networkId = parseNetworkId(req.query.networkId);
        if (networkId !== GANACHE_NETWORK_ID) {
            utils.log(`Incorrect Network ID: ${networkId}`);
            res.status(HTTP_BAD_REQUEST_STATUS).send({});
        } else {
            const signedOrder = unmarshallOrder(req.body);
            orderBook.addOrder(signedOrder);
            res.status(HTTP_OK_STATUS).send({});
        }
    },
};

function parseNetworkId(networkIdStrIfExists?: string): number {
    if (_.isUndefined(networkIdStrIfExists)) {
        return GANACHE_NETWORK_ID;
    } else {
        // tslint:disable-next-line:custom-no-magic-numbers
        const networkId = parseInt(networkIdStrIfExists as string, 10);
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
