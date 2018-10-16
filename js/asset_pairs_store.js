"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
class AssetPairsStore {
    constructor(assetPairs) {
        this._assetPairs = assetPairs;
    }
    get(assetDataA, assetDataB) {
        if (_.isUndefined(assetDataA) && _.isUndefined(assetDataB)) {
            return this._assetPairs;
        }
        else if (!_.isUndefined(assetDataA) && !_.isUndefined(assetDataB)) {
            const containsAssetDataAAndAssetDataB = (assetPair) => (assetPair.assetDataA.assetData === assetDataA && assetPair.assetDataB.assetData === assetDataB) ||
                (assetPair.assetDataA.assetData === assetDataB && assetPair.assetDataB.assetData === assetDataA);
            return this._assetPairs.filter(containsAssetDataAAndAssetDataB);
        }
        else {
            const assetData = assetDataA || assetDataB;
            const containsAssetData = (assetPair) => assetPair.assetDataA.assetData === assetData || assetPair.assetDataB.assetData === assetData;
            return this._assetPairs.filter(containsAssetData);
        }
    }
}
exports.AssetPairsStore = AssetPairsStore;
