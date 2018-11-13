import { PaginatedCollection } from '@0x/connect';
import { AssetPairsItem } from '@0x/types';
import * as _ from 'lodash';

import { paginate } from './paginator';

export class AssetPairsStore {
    private readonly _assetPairs: AssetPairsItem[];
    constructor(assetPairs: AssetPairsItem[]) {
        this._assetPairs = assetPairs;
    }
    public includes(assetDataA: string, assetDataB: string): boolean {
        return !_.isUndefined(this.getIfExists(assetDataA, assetDataB));
    }
    public getIfExists(assetDataA: string, assetDataB: string): AssetPairsItem | undefined {
        const includesAssetDataAAndAssetDataB = (assetPair: AssetPairsItem) =>
            (assetPair.assetDataA.assetData === assetDataA && assetPair.assetDataB.assetData === assetDataB) ||
            (assetPair.assetDataA.assetData === assetDataB && assetPair.assetDataB.assetData === assetDataA);
        return this._assetPairs.find(includesAssetDataAAndAssetDataB);
    }
    public get(
        page: number,
        perPage: number,
        assetDataA?: string,
        assetDataB?: string,
    ): PaginatedCollection<AssetPairsItem> {
        let nonPaginatedAssetPairs: AssetPairsItem[];
        if (_.isUndefined(assetDataA) && _.isUndefined(assetDataB)) {
            nonPaginatedAssetPairs = this._assetPairs;
        } else if (!_.isUndefined(assetDataA) && !_.isUndefined(assetDataB)) {
            const containsAssetDataAAndAssetDataB = (assetPair: AssetPairsItem) =>
                (assetPair.assetDataA.assetData === assetDataA && assetPair.assetDataB.assetData === assetDataB) ||
                (assetPair.assetDataA.assetData === assetDataB && assetPair.assetDataB.assetData === assetDataA);
            nonPaginatedAssetPairs = this._assetPairs.filter(containsAssetDataAAndAssetDataB);
        } else {
            const assetData = assetDataA || assetDataB;
            const containsAssetData = (assetPair: AssetPairsItem) =>
                assetPair.assetDataA.assetData === assetData || assetPair.assetDataB.assetData === assetData;
            nonPaginatedAssetPairs = this._assetPairs.filter(containsAssetData);
        }
        const paginatedAssetPairs = paginate(nonPaginatedAssetPairs, page, perPage);
        return paginatedAssetPairs;
    }
}
