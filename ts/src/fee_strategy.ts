import { OrderConfigRequest, OrderConfigResponse } from '@0x/connect';

import { FEE_RECIPIENT, MAKER_FEE_UNIT_AMOUNT, TAKER_FEE_UNIT_AMOUNT } from './config';
import { NULL_ADDRESS } from './constants';

export const fixedFeeStrategy = {
    getOrderConfig: (_order: Partial<OrderConfigRequest>): OrderConfigResponse => {
        const normalizedFeeRecipient = FEE_RECIPIENT.toLowerCase();
        const orderConfigResponse: OrderConfigResponse = {
            senderAddress: NULL_ADDRESS,
            feeRecipientAddress: normalizedFeeRecipient,
            makerFee: MAKER_FEE_UNIT_AMOUNT,
            takerFee: TAKER_FEE_UNIT_AMOUNT,
        };
        return orderConfigResponse;
    },
};
