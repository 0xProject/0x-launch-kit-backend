import { BigNumber } from '0x.js';
import * as _ from 'lodash';

// TODO(leo) Those are defined in @0xproject/connect but not exported. Move them to some shared SRA types package and reuse.
interface AssetPairSide {
    minAmount: BigNumber;
    maxAmount: BigNumber;
    precision: number;
    assetData: string;
}

interface AssetPair {
    assetDataA: AssetPairSide;
    assetDataB: AssetPairSide;
}

export class AssetPairsStore {
    private readonly _assetPairs: AssetPair[];
    constructor(assetPairs: AssetPair[]) {
        this._assetPairs = assetPairs;
    }
    public get(assetDataA?: string, assetDataB?: string): AssetPair[] {
        if (_.isUndefined(assetDataA) && _.isUndefined(assetDataB)) {
            return this._assetPairs;
        } else if (!_.isUndefined(assetDataA) && !_.isUndefined(assetDataB)) {
            const containsAssetDataAAndAssetDataB = (assetPair: AssetPair) =>
                (assetPair.assetDataA.assetData === assetDataA && assetPair.assetDataB.assetData === assetDataB) ||
                (assetPair.assetDataA.assetData === assetDataB && assetPair.assetDataB.assetData === assetDataA);
            return this._assetPairs.filter(containsAssetDataAAndAssetDataB);
        } else {
            const assetData = assetDataA || assetDataB;
            const containsAssetData = (assetPair: AssetPair) =>
                assetPair.assetDataA.assetData === assetData || assetPair.assetDataB.assetData === assetData;
            return this._assetPairs.filter(containsAssetData);
        }
    }
}
