"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderBookRequestSchema = {
    id: '/OrderBookRequest',
    type: 'object',
    properties: {
        baseAssetData: { $ref: '/hexSchema' },
        quoteAssetData: { $ref: '/hexSchema' },
    },
    required: ['baseAssetData', 'quoteAssetData'],
};
