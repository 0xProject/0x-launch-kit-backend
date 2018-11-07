"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
class AssetPairsStore {
    constructor(assetPairs) {
        this._assetPairs = assetPairs;
    }
    get(page, perPage, assetDataA, assetDataB) {
        let unpaged;
        if (_.isUndefined(assetDataA) && _.isUndefined(assetDataB)) {
            unpaged = this._assetPairs;
        }
        else if (!_.isUndefined(assetDataA) && !_.isUndefined(assetDataB)) {
            const containsAssetDataAAndAssetDataB = (assetPair) => (assetPair.assetDataA.assetData === assetDataA && assetPair.assetDataB.assetData === assetDataB) ||
                (assetPair.assetDataA.assetData === assetDataB && assetPair.assetDataB.assetData === assetDataA);
            unpaged = this._assetPairs.filter(containsAssetDataAAndAssetDataB);
        }
        else {
            const assetData = assetDataA || assetDataB;
            const containsAssetData = (assetPair) => assetPair.assetDataA.assetData === assetData || assetPair.assetDataB.assetData === assetData;
            unpaged = this._assetPairs.filter(containsAssetData);
        }
        const paginatedAssetPairs = {
            total: this._assetPairs.length,
            page,
            perPage,
            records: unpaged.slice(page * perPage, (page + 1) * perPage),
        };
        return paginatedAssetPairs;
    }
}
exports.AssetPairsStore = AssetPairsStore;
