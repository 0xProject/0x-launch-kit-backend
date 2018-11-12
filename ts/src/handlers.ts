import { BigNumber, SignedOrder } from '0x.js';
import { schemas } from '@0x/json-schemas';
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';
import * as _ from 'lodash';

import { AssetPairsStore } from './asset_pairs_store';
import { ASSET_PAIRS, FEE_RECIPIENTS } from './config';
import { NULL_ADDRESS } from './constants';
import { NotFoundError, ValidationError, ValidationErrorCodes } from './errors';
import { orderBook } from './orderbook';
import { utils } from './utils';

const assetPairsStore = new AssetPairsStore(ASSET_PAIRS);

const DEFAULT_PAGE = 0;
const DEFAULT_PER_PAGE = 20;

export const handlers = {
    assetPairs: (req: express.Request, res: express.Response) => {
        utils.validateSchema(req.query, schemas.assetPairsRequestOptsSchema);
        const page = _.isUndefined(req.query.page) ? DEFAULT_PAGE : Number(req.query.page);
        const perPage = _.isUndefined(req.query.perPage) ? DEFAULT_PER_PAGE : Number(req.query.perPage);
        const assetPairs = assetPairsStore.get(page, perPage, req.query.assetDataA, req.query.assetDataB);
        res.status(HttpStatus.OK).send(assetPairs);
    },
    ordersAsync: async (req: express.Request, res: express.Response) => {
        utils.validateSchema(req.query, schemas.ordersRequestOptsSchema);
        const page = _.isUndefined(req.query.page) ? DEFAULT_PAGE : Number(req.query.page);
        const perPage = _.isUndefined(req.query.perPage) ? DEFAULT_PER_PAGE : Number(req.query.perPage);
        const paginatedOrders = await orderBook.getOrdersAsync(page, perPage, req.query);
        res.status(HttpStatus.OK).send(paginatedOrders);
    },
    feeRecipients: (req: express.Request, res: express.Response) => {
        const page = _.isUndefined(req.query.page) ? DEFAULT_PAGE : Number(req.query.page);
        const perPage = _.isUndefined(req.query.perPage) ? DEFAULT_PER_PAGE : Number(req.query.perPage);
        const paginatedFeeRecipients = {
            total: FEE_RECIPIENTS.length,
            page,
            perPage,
            records: FEE_RECIPIENTS.slice(page * perPage, (page + 1) * perPage),
        };
        res.status(HttpStatus.OK).send(paginatedFeeRecipients);
    },
    orderbookAsync: async (req: express.Request, res: express.Response) => {
        utils.validateSchema(req.query, schemas.orderBookRequestSchema);
        const page = _.isUndefined(req.query.page) ? DEFAULT_PAGE : Number(req.query.page);
        const perPage = _.isUndefined(req.query.perPage) ? DEFAULT_PER_PAGE : Number(req.query.perPage);
        const baseAssetData = req.query.baseAssetData;
        const quoteAssetData = req.query.quoteAssetData;
        const orderbookResponse = await orderBook.getOrderBookAsync(page, perPage, baseAssetData, quoteAssetData);
        res.status(HttpStatus.OK).send(orderbookResponse);
    },
    orderConfig: (req: express.Request, res: express.Response) => {
        utils.validateSchema(req.body, schemas.orderConfigRequestSchema);
        const orderConfigResponse = {
            senderAddress: NULL_ADDRESS,
            feeRecipientAddress: NULL_ADDRESS,
            makerFee: 0,
            takerFee: '1000',
        };
        res.status(HttpStatus.OK).send(orderConfigResponse);
    },
    postOrderAsync: async (req: express.Request, res: express.Response) => {
        utils.validateSchema(req.body, schemas.signedOrderSchema);
        const signedOrder = unmarshallOrder(req.body);
        if (assetPairsStore.includes(signedOrder.makerAssetData, signedOrder.takerAssetData)) {
            throw new ValidationError([
                {
                    field: 'assetPair',
                    code: ValidationErrorCodes.valueOutOfRange,
                    reason: 'Asset pair not supported',
                },
            ]);
        }
        await orderBook.addOrderAsync(signedOrder);
        res.status(HttpStatus.OK).send();
    },
    getOrderByHashAsync: async (req: express.Request, res: express.Response) => {
        const orderIfExists = await orderBook.getOrderByHashIfExistsAsync(req.params.orderHash);
        if (_.isUndefined(orderIfExists)) {
            throw new NotFoundError();
        } else {
            res.status(HttpStatus.OK).send(orderIfExists);
        }
    },
};

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
