import { BigNumber } from '0x.js';

const DEFAULT_HTTP_PORT = 3000;
export const HTTP_PORT = process.env.PORT || DEFAULT_HTTP_PORT;

const GANACHE_NETWORK_ID = 50;
const DEFAULT_NETWORK_ID = GANACHE_NETWORK_ID;

export const NETWORK_ID = Number(process.env.NETWORK_ID) || DEFAULT_NETWORK_ID;

// TODO(leo): Load those from config.
export const FEE_RECIPIENTS = [
    '0x6eC92694ea172ebC430C30fa31De87620967A082',
    '0x9e56625509c2f60af937f23b7b532600390e8c8b',
    '0xa2b31dacf30a9c50ca473337c01d8a201ae33e32',
];

// TODO(leo): Load those from config.
export const ASSET_PAIRS = [
    {
        assetDataA: {
            minAmount: new BigNumber(0),
            maxAmount: new BigNumber(0),
            precision: 5,
            assetData: '0xf47261b04c32345ced77393b3530b1eed0f346429d',
        },
        assetDataB: {
            minAmount: new BigNumber(0),
            maxAmount: new BigNumber(0),
            precision: 5,
            assetData: '0x0257179264389b814a946f3e92105513705ca6b990',
        },
    },
];

export const RPC_URL = 'https://mainnet.infura.io';
