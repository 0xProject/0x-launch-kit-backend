import { BigNumber, orderHashUtils, SignedOrder } from '0x.js';
import { assetDataUtils } from '@0x/order-utils';
import { APIOrder, OrderbookResponse, PaginatedCollection } from '@0x/connect';
import { OrdersRequestOpts } from '@0x/types';
import * as _ from 'lodash';

import { getDBConnection } from './db_connection';
import { SignedOrderModel } from './models/SignedOrderModel';

export const orderBook = {
    addOrderAsync: async (signedOrder: SignedOrder) => {
        const signedOrderModel = serializeOrder(signedOrder);
        const connection = getDBConnection();
        await connection.manager.save(signedOrderModel);
    },
    getOrderBookAsync: async (
        page: number,
        perPage: number,
        baseAssetData: string,
        quoteAssetData: string,
    ): Promise<OrderbookResponse> => {
        const connection = getDBConnection();
        const bidSignedOrderModels = (await connection.manager.find(SignedOrderModel, {
            where: { takerAssetData: baseAssetData, makerAssetData: quoteAssetData },
        })) as Array<Required<SignedOrderModel>>;
        const askSignedOrderModels = (await connection.manager.find(SignedOrderModel, {
            where: { takerAssetData: quoteAssetData, makerAssetData: baseAssetData },
        })) as Array<Required<SignedOrderModel>>;
        const bidApiOrders: APIOrder[] = bidSignedOrderModels
            .map(deserializeOrder)
            .map(signedOrder => ({ metaData: {}, order: signedOrder }));
        const askApiOrders: APIOrder[] = askSignedOrderModels
            .map(deserializeOrder)
            .map(signedOrder => ({ metaData: {}, order: signedOrder }));
        const paginatedBidApiOrders = {
            total: bidApiOrders.length,
            page,
            perPage,
            records: bidApiOrders.slice(page * perPage, (page + 1) * perPage),
        };
        const paginatedAskApiOrders = {
            total: askApiOrders.length,
            page,
            perPage,
            records: askApiOrders.slice(page * perPage, (page + 1) * perPage),
        };
        return {
            bids: paginatedBidApiOrders,
            asks: paginatedAskApiOrders,
        };
    },
    // TODO:(leo) Do all filtering and pagination in a DB (requires stored procedures or redundant fields)
    getOrdersAsync: async (
        page: number,
        perPage: number,
        ordersFilterParams: OrdersRequestOpts,
    ): Promise<PaginatedCollection<APIOrder>> => {
        const connection = getDBConnection();
        // Pre-filters
        const filterObjectWithValuesIfExist: Partial<SignedOrder> = {
            exchangeAddress: ordersFilterParams.exchangeAddress,
            senderAddress: ordersFilterParams.senderAddress,
            makerAssetData: ordersFilterParams.makerAssetData,
            takerAssetData: ordersFilterParams.takerAssetData,
            makerAddress: ordersFilterParams.makerAddress,
            takerAddress: ordersFilterParams.takerAddress,
            feeRecipientAddress: ordersFilterParams.feeRecipientAddress,
        };
        const filterObject = _.pickBy(filterObjectWithValuesIfExist, _.identity.bind(_));
        const signedOrderModels = (await connection.manager.find(SignedOrderModel, { where: filterObject })) as Array<
            Required<SignedOrderModel>
        >;
        let signedOrders = _.map(signedOrderModels, deserializeOrder);
        // Post-filters
        signedOrders = signedOrders
            .filter(
                // traderAddress
                signedOrder =>
                    _.isUndefined(ordersFilterParams.traderAddress) ||
                    signedOrder.makerAddress === ordersFilterParams.traderAddress ||
                    signedOrder.takerAddress === ordersFilterParams.traderAddress,
            )
            .filter(
                // makerAssetAddress
                signedOrder =>
                    _.isUndefined(ordersFilterParams.makerAssetAddress) ||
                    assetDataUtils.decodeAssetDataOrThrow(signedOrder.makerAssetData).tokenAddress ===
                        ordersFilterParams.makerAssetAddress,
            )
            .filter(
                // takerAssetAddress
                signedOrder =>
                    _.isUndefined(ordersFilterParams.takerAssetAddress) ||
                    assetDataUtils.decodeAssetDataOrThrow(signedOrder.takerAssetData).tokenAddress ===
                        ordersFilterParams.takerAssetAddress,
            )
            .filter(
                // makerAssetProxyId
                signedOrder =>
                    _.isUndefined(ordersFilterParams.makerAssetProxyId) ||
                    assetDataUtils.decodeAssetDataOrThrow(signedOrder.makerAssetData).assetProxyId ===
                        ordersFilterParams.makerAssetProxyId,
            )
            .filter(
                // makerAssetProxyId
                signedOrder =>
                    _.isUndefined(ordersFilterParams.takerAssetProxyId) ||
                    assetDataUtils.decodeAssetDataOrThrow(signedOrder.takerAssetData).assetProxyId ===
                        ordersFilterParams.takerAssetProxyId,
            );
        const apiOrders: APIOrder[] = signedOrders.map(signedOrder => ({ metaData: {}, order: signedOrder }));
        const paginatedApiOrders = {
            total: apiOrders.length,
            page,
            perPage,
            records: apiOrders.slice(page * perPage, (page + 1) * perPage),
        };
        return paginatedApiOrders;
    },
    getOrderByHashIfExistsAsync: async (orderHash: string): Promise<SignedOrder | undefined> => {
        const connection = getDBConnection();
        const signedOrderModelIfExists = await connection.manager.findOne(SignedOrderModel, orderHash);
        if (_.isUndefined(signedOrderModelIfExists)) {
            return undefined;
        } else {
            return deserializeOrder(signedOrderModelIfExists as Required<SignedOrderModel>);
        }
    },
};

const deserializeOrder = (signedOrderModel: Required<SignedOrderModel>): SignedOrder => {
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
    const signedOrderModel = new SignedOrderModel({
        signature: signedOrder.signature,
        senderAddress: signedOrder.senderAddress,
        makerAddress: signedOrder.makerAddress,
        takerAddress: signedOrder.takerAddress,
        makerFee: signedOrder.makerFee.toString(),
        takerFee: signedOrder.takerFee.toString(),
        makerAssetAmount: signedOrder.makerAssetAmount.toString(),
        takerAssetAmount: signedOrder.takerAssetAmount.toString(),
        makerAssetData: signedOrder.makerAssetData,
        takerAssetData: signedOrder.takerAssetData,
        salt: signedOrder.salt.toString(),
        exchangeAddress: signedOrder.exchangeAddress,
        feeRecipientAddress: signedOrder.feeRecipientAddress,
        expirationTimeSeconds: signedOrder.expirationTimeSeconds.toNumber(),
        hash: orderHashUtils.getOrderHashHex(signedOrder),
    });
    return signedOrderModel;
};
