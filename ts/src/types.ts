import { BigNumber } from '0x.js';
import { APIOrder, SignedOrder } from '@0x/types';

export enum OrderWatcherLifeCycleEvents {
    Add,
    Remove,
    Update,
}

export type onOrdersUpdateCallback = (orders: APIOrderWithMetaData[]) => void;

export interface AdaptedOrderAndValidationResult {
    order: SignedOrder;
    message: string | undefined;
    metaData: APIOrderMetaData;
}

export interface AdaptedValidationResults {
    accepted: AdaptedOrderAndValidationResult[];
    rejected: AdaptedOrderAndValidationResult[];
}

export interface APIOrderMetaData {
    orderHash: string;
    remainingFillableTakerAssetAmount: BigNumber;
}

export interface APIOrderWithMetaData extends APIOrder {
    metaData: APIOrderMetaData;
}
