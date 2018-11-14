import { BigNumber, SignedOrder } from '0x.js';
import { schemas } from '@0x/json-schemas';
import { Web3Wrapper } from '@0x/web3-wrapper';
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';
import * as _ from 'lodash';

import { AssetPairsStore } from './asset_pairs_store';
import {
    ASSET_PAIRS,
    FEE_RECIPIENT,
    MAKER_FEE_ZRX_UNIT_AMOUNT,
    MAX_PER_PAGE,
    TAKER_FEE_ZRX_UNIT_AMOUNT,
} from './config';
import { DEFAULT_PAGE, DEFAULT_PER_PAGE, NULL_ADDRESS, ZRX_DECIMALS } from './constants';
import { NotFoundError, ValidationError, ValidationErrorCodes } from './errors';
import { orderBook } from './orderbook';
import { paginate } from './paginator';
import { utils } from './utils';

const assetPairsStore = new AssetPairsStore(ASSET_PAIRS);

const parsePaginationConfig = (req: express.Request): { page: number; perPage: number } => {
    const page = _.isUndefined(req.query.page) ? DEFAULT_PAGE : Number(req.query.page);
    const perPage = _.isUndefined(req.query.perPage) ? DEFAULT_PER_PAGE : Number(req.query.perPage);
    if (perPage > MAX_PER_PAGE) {
        throw new ValidationError([
            {
                field: 'perPage',
                code: ValidationErrorCodes.valueOutOfRange,
                reason: `perPage should be less or equal to ${MAX_PER_PAGE}`,
            },
        ]);
    }
    return { page, perPage };
};

export const handlers = {
    assetPairs: (req: express.Request, res: express.Response) => {
        utils.validateSchema(req.query, schemas.assetPairsRequestOptsSchema);
        const { page, perPage } = parsePaginationConfig(req);
        const assetPairs = assetPairsStore.get(page, perPage, req.query.assetDataA, req.query.assetDataB);
        res.status(HttpStatus.OK).send(assetPairs);
    },
    ordersAsync: async (req: express.Request, res: express.Response) => {
        utils.validateSchema(req.query, schemas.ordersRequestOptsSchema);
        const { page, perPage } = parsePaginationConfig(req);
        const paginatedOrders = await orderBook.getOrdersAsync(page, perPage, req.query);
        res.status(HttpStatus.OK).send(paginatedOrders);
    },
    feeRecipients: (req: express.Request, res: express.Response) => {
        const { page, perPage } = parsePaginationConfig(req);
        const FEE_RECIPIENTS = [FEE_RECIPIENT];
        const paginatedFeeRecipients = paginate(FEE_RECIPIENTS, page, perPage);
        res.status(HttpStatus.OK).send(paginatedFeeRecipients);
    },
    orderbookAsync: async (req: express.Request, res: express.Response) => {
        utils.validateSchema(req.query, schemas.orderBookRequestSchema);
        const { page, perPage } = parsePaginationConfig(req);
        const baseAssetData = req.query.baseAssetData;
        const quoteAssetData = req.query.quoteAssetData;
        const orderbookResponse = await orderBook.getOrderBookAsync(page, perPage, baseAssetData, quoteAssetData);
        res.status(HttpStatus.OK).send(orderbookResponse);
    },
    orderConfig: (req: express.Request, res: express.Response) => {
        utils.validateSchema(req.body, schemas.orderConfigRequestSchema);
        const orderConfigResponse = {
            senderAddress: NULL_ADDRESS,
            feeRecipientAddress: FEE_RECIPIENT,
            makerFee: Web3Wrapper.toBaseUnitAmount(MAKER_FEE_ZRX_UNIT_AMOUNT, ZRX_DECIMALS).toString(),
            takerFee: Web3Wrapper.toBaseUnitAmount(TAKER_FEE_ZRX_UNIT_AMOUNT, ZRX_DECIMALS).toString(),
        };
        res.status(HttpStatus.OK).send(orderConfigResponse);
    },
    postOrderAsync: async (req: express.Request, res: express.Response) => {
        utils.validateSchema(req.body, schemas.signedOrderSchema);
        const signedOrder = unmarshallOrder(req.body);
        if (!assetPairsStore.includes(signedOrder.makerAssetData, signedOrder.takerAssetData)) {
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
