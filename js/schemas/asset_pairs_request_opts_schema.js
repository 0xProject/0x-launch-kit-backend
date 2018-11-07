'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.assetPairsRequestOptsSchema = {
    id: '/AssetPairsRequestOpts',
    type: 'object',
    properties: {
        assetDataA: { $ref: '/hexSchema' },
        assetDataB: { $ref: '/hexSchema' },
    },
};
