import { assetDataUtils, BigNumber, SignedOrder } from '0x.js';
import { schemas } from '@0x/json-schemas';
import { Web3Wrapper } from '@0x/web3-wrapper';
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';
import * as _ from 'lodash';

import {
    FEE_RECIPIENT,
    MAKER_FEE_ZRX_UNIT_AMOUNT,
    MAX_PER_PAGE,
    TAKER_FEE_ZRX_UNIT_AMOUNT,
    WHITELISTED_TOKENS,
} from './config';
import { DEFAULT_PAGE, DEFAULT_PER_PAGE, NULL_ADDRESS, ZRX_DECIMALS } from './constants';
import { NotFoundError, ValidationError, ValidationErrorCodes } from './errors';
import { OrderBook } from './orderbook';
import { paginate } from './paginator';
import { utils } from './utils';

const parsePaginationConfig = (req: express.Request): { page: number; perPage: number } => {
    const page = req.query.page === undefined ? DEFAULT_PAGE : Number(req.query.page);
    const perPage = req.query.perPage === undefined ? DEFAULT_PER_PAGE : Number(req.query.perPage);
    if (perPage > MAX_PER_PAGE) {
        throw new ValidationError([
            {
                field: 'perPage',
                code: ValidationErrorCodes.ValueOutOfRange,
                reason: `perPage should be less or equal to ${MAX_PER_PAGE}`,
            },
        ]);
    }
    return { page, perPage };
};

export class Handlers {
    private readonly _orderBook: OrderBook;
    public static feeRecipients(req: express.Request, res: express.Response): void {
        const { page, perPage } = parsePaginationConfig(req);
        const normalizedFeeRecipient = FEE_RECIPIENT.toLowerCase();
        const feeRecipients = [normalizedFeeRecipient];
        const paginatedFeeRecipients = paginate(feeRecipients, page, perPage);
        res.status(HttpStatus.OK).send(paginatedFeeRecipients);
    }
    public static orderConfig(req: express.Request, res: express.Response): void {
        utils.validateSchema(req.body, schemas.orderConfigRequestSchema);
        const normalizedFeeRecipient = FEE_RECIPIENT.toLowerCase();
        const orderConfigResponse = {
            senderAddress: NULL_ADDRESS,
            feeRecipientAddress: normalizedFeeRecipient,
            makerFee: Web3Wrapper.toBaseUnitAmount(MAKER_FEE_ZRX_UNIT_AMOUNT, ZRX_DECIMALS).toString(),
            takerFee: Web3Wrapper.toBaseUnitAmount(TAKER_FEE_ZRX_UNIT_AMOUNT, ZRX_DECIMALS).toString(),
        };
        res.status(HttpStatus.OK).send(orderConfigResponse);
    }
    public static async assetPairsAsync(req: express.Request, res: express.Response): Promise<void> {
        utils.validateSchema(req.query, schemas.assetPairsRequestOptsSchema);
        const { page, perPage } = parsePaginationConfig(req);
        const assetPairs = await OrderBook.getAssetPairsAsync(
            page,
            perPage,
            req.query.assetDataA,
            req.query.assetDataB,
        );
        res.status(HttpStatus.OK).send(assetPairs);
    }
    public static async getOrderByHashAsync(req: express.Request, res: express.Response): Promise<void> {
        const orderIfExists = await OrderBook.getOrderByHashIfExistsAsync(req.params.orderHash);
        if (orderIfExists === undefined) {
            throw new NotFoundError();
        } else {
            res.status(HttpStatus.OK).send(orderIfExists);
        }
    }
    constructor() {
        this._orderBook = new OrderBook();
    }
    public async initOrderBookAsync(): Promise<void> {
        await this._orderBook.addExistingOrdersToOrderWatcherAsync();
    }
    public async ordersAsync(req: express.Request, res: express.Response): Promise<void> {
        utils.validateSchema(req.query, schemas.ordersRequestOptsSchema);
        const { page, perPage } = parsePaginationConfig(req);
        const paginatedOrders = await this._orderBook.getOrdersAsync(page, perPage, req.query);
        res.status(HttpStatus.OK).send(paginatedOrders);
    }
    public async orderbookAsync(req: express.Request, res: express.Response): Promise<void> {
        utils.validateSchema(req.query, schemas.orderBookRequestSchema);
        const { page, perPage } = parsePaginationConfig(req);
        const baseAssetData = req.query.baseAssetData;
        const quoteAssetData = req.query.quoteAssetData;
        const orderbookResponse = await this._orderBook.getOrderBookAsync(page, perPage, baseAssetData, quoteAssetData);
        res.status(HttpStatus.OK).send(orderbookResponse);
    }
    public async postOrderAsync(req: express.Request, res: express.Response): Promise<void> {
        utils.validateSchema(req.body, schemas.signedOrderSchema);
        const signedOrder = unmarshallOrder(req.body);
        if (WHITELISTED_TOKENS !== '*') {
            const allowedTokens: string[] = WHITELISTED_TOKENS;
            validateAssetDataIsWhitelistedOrThrow(allowedTokens, signedOrder.makerAssetData, 'makerAssetData');
            validateAssetDataIsWhitelistedOrThrow(allowedTokens, signedOrder.takerAssetData, 'takerAssetData');
        }
        try {
            await this._orderBook.addOrderAsync(signedOrder);
        } catch (err) {
            throw new ValidationError([
                {
                    field: 'signedOrder',
                    code: ValidationErrorCodes.InvalidOrder,
                    reason: err.message,
                },
            ]);
        }
        res.status(HttpStatus.OK).send();
    }
}

function validateAssetDataIsWhitelistedOrThrow(allowedTokens: string[], assetData: string, field: string): void {
    const decodedAssetData = assetDataUtils.decodeAssetDataOrThrow(assetData);
    if (assetDataUtils.isMultiAssetData(decodedAssetData)) {
        for (const [, nestedAssetDataElement] of decodedAssetData.nestedAssetData.entries()) {
            validateAssetDataIsWhitelistedOrThrow(allowedTokens, nestedAssetDataElement, field);
        }
    } else if (!assetDataUtils.isStaticCallAssetData(decodedAssetData)) {
        if (!_.includes(allowedTokens, decodedAssetData.tokenAddress)) {
            throw new ValidationError([
                {
                    field,
                    code: ValidationErrorCodes.ValueOutOfRange,
                    reason: `${decodedAssetData.tokenAddress} not supported`,
                },
            ]);
        }
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
