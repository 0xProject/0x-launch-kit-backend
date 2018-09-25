import { BigNumber, SignedOrder } from '0x.js';
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';
import * as _ from 'lodash';

import { AssetPairsStore } from './asset_pairs_store';
import { orderBook } from './orderbook';
import { paginate } from './paginator';
import { utils } from './utils';

const GANACHE_NETWORK_ID = 50;
const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

// TODO(leo): Load those from config.
const FEE_RECIPIENTS = [
    '0x6eC92694ea172ebC430C30fa31De87620967A082',
    '0x9e56625509c2f60af937f23b7b532600390e8c8b',
    '0xa2b31dacf30a9c50ca473337c01d8a201ae33e32',
];
// TODO(leo): Load those from config.
const ASSET_PAIRS = [
    {
        assetDataA: {
            minAmount: new BigNumber(0),
            maxAmount: new BigNumber(0),
            precision: 5,
            assetData: '0xf47261b04c32345ced77393b3530b1eed0f346429d',
        },
        assetDataB: {
            minAmount: new BigNumber(0),
            maxAmount: new BigNumber(0),
            precision: 5,
            assetData: '0x0257179264389b814a946f3e92105513705ca6b990',
        },
    },
];

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
        utils.log('HTTP: GET orderbook');
        const baseAssetData = req.query.baseAssetData;
        const quoteAssetData = req.query.quoteAssetData;
        const networkId = parseNetworkId(req.query.networkId);
        if (networkId !== GANACHE_NETWORK_ID) {
            utils.log(`Incorrect Network ID: ${networkId}`);
            res.status(HttpStatus.BAD_REQUEST).send();
        } else {
            const orderbookResponse = orderBook.getOrderBook(baseAssetData, quoteAssetData);
            res.status(HttpStatus.OK).send(orderbookResponse);
        }
    },
    orderConfig: (req: express.Request, res: express.Response) => {
        utils.log('HTTP: GET order config');
        const networkId = parseNetworkId(req.query.networkId);
        if (networkId !== GANACHE_NETWORK_ID) {
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
    order: (req: express.Request, res: express.Response) => {
        utils.log('HTTP: POST order');
        const networkId = parseNetworkId(req.query.networkId);
        if (networkId !== GANACHE_NETWORK_ID) {
            utils.log(`Incorrect Network ID: ${networkId}`);
            res.status(HttpStatus.BAD_REQUEST).send();
        } else {
            const signedOrder = unmarshallOrder(req.body);
            orderBook.addOrder(signedOrder);
            res.status(HttpStatus.OK).send();
        }
    },
};

// TODO(leo): Throw if networkId is unsupported
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
