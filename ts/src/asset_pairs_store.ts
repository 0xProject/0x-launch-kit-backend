import { PaginatedCollection } from '@0x/connect';
import { AssetPairsItem } from '@0x/types';
import * as _ from 'lodash';

export class AssetPairsStore {
    private readonly _assetPairs: AssetPairsItem[];
    constructor(assetPairs: AssetPairsItem[]) {
        this._assetPairs = assetPairs;
    }
    public get(
        page: number,
        perPage: number,
        assetDataA?: string,
        assetDataB?: string,
    ): PaginatedCollection<AssetPairsItem> {
        let unpaged: AssetPairsItem[];
        if (_.isUndefined(assetDataA) && _.isUndefined(assetDataB)) {
            unpaged = this._assetPairs;
        } else if (!_.isUndefined(assetDataA) && !_.isUndefined(assetDataB)) {
            const containsAssetDataAAndAssetDataB = (assetPair: AssetPairsItem) =>
                (assetPair.assetDataA.assetData === assetDataA && assetPair.assetDataB.assetData === assetDataB) ||
                (assetPair.assetDataA.assetData === assetDataB && assetPair.assetDataB.assetData === assetDataA);
            unpaged = this._assetPairs.filter(containsAssetDataAAndAssetDataB);
        } else {
            const assetData = assetDataA || assetDataB;
            const containsAssetData = (assetPair: AssetPairsItem) =>
                assetPair.assetDataA.assetData === assetData || assetPair.assetDataB.assetData === assetData;
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
