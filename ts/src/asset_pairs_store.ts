import { AssetPairsItem } from '@0xproject/types';
import * as _ from 'lodash';

export class AssetPairsStore {
    private readonly _assetPairs: AssetPairsItem[];
    constructor(assetPairs: AssetPairsItem[]) {
        this._assetPairs = assetPairs;
    }
    public get(assetDataA?: string, assetDataB?: string): AssetPairsItem[] {
        if (_.isUndefined(assetDataA) && _.isUndefined(assetDataB)) {
            return this._assetPairs;
        } else if (!_.isUndefined(assetDataA) && !_.isUndefined(assetDataB)) {
            const containsAssetDataAAndAssetDataB = (assetPair: AssetPairsItem) =>
                (assetPair.assetDataA.assetData === assetDataA && assetPair.assetDataB.assetData === assetDataB) ||
                (assetPair.assetDataA.assetData === assetDataB && assetPair.assetDataB.assetData === assetDataA);
            return this._assetPairs.filter(containsAssetDataAAndAssetDataB);
        } else {
            const assetData = assetDataA || assetDataB;
            const containsAssetData = (assetPair: AssetPairsItem) =>
                assetPair.assetDataA.assetData === assetData || assetPair.assetDataB.assetData === assetData;
            return this._assetPairs.filter(containsAssetData);
        }
    }
}
