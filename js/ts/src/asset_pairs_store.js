"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const paginator_1 = require("./paginator");
class AssetPairsStore {
    constructor(assetPairs) {
        this._assetPairs = assetPairs;
    }
    includes(assetDataA, assetDataB) {
        const includesAssetDataAAndAssetDataB = (assetPair) => (assetPair.assetDataA.assetData === assetDataA && assetPair.assetDataB.assetData === assetDataB) ||
            (assetPair.assetDataA.assetData === assetDataB && assetPair.assetDataB.assetData === assetDataA);
        return !_.isUndefined(this._assetPairs.find(includesAssetDataAAndAssetDataB));
    }
    get(page, perPage, assetDataA, assetDataB) {
        let nonPaginatedAssetPairs;
        if (_.isUndefined(assetDataA) && _.isUndefined(assetDataB)) {
            nonPaginatedAssetPairs = this._assetPairs;
        }
        else if (!_.isUndefined(assetDataA) && !_.isUndefined(assetDataB)) {
            const containsAssetDataAAndAssetDataB = (assetPair) => (assetPair.assetDataA.assetData === assetDataA && assetPair.assetDataB.assetData === assetDataB) ||
                (assetPair.assetDataA.assetData === assetDataB && assetPair.assetDataB.assetData === assetDataA);
            nonPaginatedAssetPairs = this._assetPairs.filter(containsAssetDataAAndAssetDataB);
        }
        else {
            const assetData = assetDataA || assetDataB;
            const containsAssetData = (assetPair) => assetPair.assetDataA.assetData === assetData || assetPair.assetDataB.assetData === assetData;
            nonPaginatedAssetPairs = this._assetPairs.filter(containsAssetData);
        }
        const paginatedAssetPairs = paginator_1.paginate(nonPaginatedAssetPairs, page, perPage);
        return paginatedAssetPairs;
    }
}
exports.AssetPairsStore = AssetPairsStore;
