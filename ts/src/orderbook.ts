import { BigNumber, orderHashUtils, SignedOrder } from '0x.js';
import { APIOrder, OrderbookResponse } from '@0xproject/connect';
import * as _ from 'lodash';

import { getDBConnection } from './db_connection';
import { SignedOrderModel } from './entity/SignedOrderModel';
import { paginate } from './paginator';

export const orderBook = {
    addOrderAsync: async (signedOrder: SignedOrder) => {
        const signedOrderModel = serializeOrder(signedOrder);
        const connection = getDBConnection();
        await connection.manager.save(signedOrderModel);
    },
    getOrderBookAsync: async (baseAssetData: string, quoteAssetData: string): Promise<OrderbookResponse> => {
        const connection = getDBConnection();
        const bidSignedOrderModels = await connection.manager.find(SignedOrderModel, {
            where: { takerAssetData: baseAssetData, makerAssetData: quoteAssetData },
        });
        const askSignedOrderModels = await connection.manager.find(SignedOrderModel, {
            where: { takerAssetData: quoteAssetData, makerAssetData: baseAssetData },
        });
        const bidApiOrders: APIOrder[] = bidSignedOrderModels
            .map(deserializeOrder)
            .map(signedOrder => ({ metaData: {}, order: signedOrder }));
        const askApiOrders: APIOrder[] = askSignedOrderModels
            .map(deserializeOrder)
            .map(signedOrder => ({ metaData: {}, order: signedOrder }));

        return {
            bids: paginate(bidApiOrders),
            asks: paginate(askApiOrders),
        };
    },
    getOrdersAsync: async (): Promise<APIOrder[]> => {
        const connection = getDBConnection();
        const signedOrderModels = await connection.manager.find(SignedOrderModel);
        const signedOrders = _.map(signedOrderModels, deserializeOrder);
        const apiOrders: APIOrder[] = signedOrders.map(signedOrder => ({ metaData: {}, order: signedOrder }));
        return apiOrders;
    },
    getOrderByHashIfExistsAsync: async (orderHash: string): Promise<SignedOrder | undefined> => {
        const connection = getDBConnection();
        const signedOrderModelIfExists = await connection.manager.findOne(SignedOrderModel, orderHash);
        if (_.isUndefined(signedOrderModelIfExists)) {
            return undefined;
        } else {
            return deserializeOrder(signedOrderModelIfExists);
        }
    },
};

const deserializeOrder = (signedOrderModel: SignedOrderModel): SignedOrder => {
    const signedOrder: SignedOrder = {
        signature: signedOrderModel.signature,
        senderAddress: signedOrderModel.senderAddress,
        makerAddress: signedOrderModel.makerAddress,
        takerAddress: signedOrderModel.takerAddress,
        makerFee: new BigNumber(signedOrderModel.makerFee),
        takerFee: new BigNumber(signedOrderModel.takerFee),
        makerAssetAmount: new BigNumber(signedOrderModel.makerAssetAmount),
        takerAssetAmount: new BigNumber(signedOrderModel.takerAssetAmount),
        makerAssetData: signedOrderModel.makerAssetData,
        takerAssetData: signedOrderModel.takerAssetData,
        salt: new BigNumber(signedOrderModel.salt),
        exchangeAddress: signedOrderModel.exchangeAddress,
        feeRecipientAddress: signedOrderModel.feeRecipientAddress,
        expirationTimeSeconds: new BigNumber(signedOrderModel.expirationTimeSeconds),
    };
    return signedOrder;
};

const serializeOrder = (signedOrder: SignedOrder): SignedOrderModel => {
    const signedOrderModel = new SignedOrderModel();
    signedOrderModel.signature = signedOrder.signature;
    signedOrderModel.senderAddress = signedOrder.senderAddress;
    signedOrderModel.makerAddress = signedOrder.makerAddress;
    signedOrderModel.takerAddress = signedOrder.takerAddress;
    signedOrderModel.makerFee = signedOrder.makerFee.toString();
    signedOrderModel.takerFee = signedOrder.takerFee.toString();
    signedOrderModel.makerAssetAmount = signedOrder.makerAssetAmount.toString();
    signedOrderModel.takerAssetAmount = signedOrder.takerAssetAmount.toString();
    signedOrderModel.makerAssetData = signedOrder.makerAssetData;
    signedOrderModel.takerAssetData = signedOrder.takerAssetData;
    signedOrderModel.salt = signedOrder.salt.toString();
    signedOrderModel.exchangeAddress = signedOrder.exchangeAddress;
    signedOrderModel.feeRecipientAddress = signedOrder.feeRecipientAddress;
    signedOrderModel.expirationTimeSeconds = signedOrder.expirationTimeSeconds.toNumber();
    signedOrderModel.hash = orderHashUtils.getOrderHashHex(signedOrder);
    return signedOrderModel;
};
