// tslint:disable:custom-no-magic-numbers
import { BigNumber } from '0x.js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as path from 'path';

const metadataPath = path.join(__dirname, '../../metadata.json');
const metadata = JSON.parse(fs.readFileSync(metadataPath).toString());

// Whitelisted token addresses. Set to a '*' instead of an array to allow all tokens.
export const WHITELISTED_TOKENS: string[] | '*' = [
    '0x2002d3812f58e35f0ea1ffbf80a75a38c32175fa', // ZRX
    '0xd0a1e359811322d97991e03f863a0c30c2cf029c', // WETH
];

// Network port to listen on
export const HTTP_PORT = !_.isEmpty(process.env.HTTP_PORT) ? _.parseInt(process.env.HTTP_PORT as string) : 3000;
// A time window after which the order is considered permanently expired
export const ORDER_SHADOWING_MARGIN_MS = 100 * 1000; // tslint:disable-line custom-no-magic-numbers
// Frequency of checks for permanently expired orders
export const PERMANENT_CLEANUP_INTERVAL_MS = 10 * 1000; // tslint:disable-line custom-no-magic-numbers
// Max number of entities per page
export const MAX_PER_PAGE = 1000;
// Default network id to use when not specified
export const NETWORK_ID = !_.isEmpty(process.env.NETWORK_ID) ? _.parseInt(process.env.NETWORK_ID as string) : 42;
// The fee recipient for orders
export const FEE_RECIPIENT = !_.isEmpty(process.env.FEE_RECIPIENT)
    ? (process.env.FEE_RECIPIENT as string)
    : getDefaultFeeRecipient();
// A flat fee in ZRX that should be charged to the order maker
export const MAKER_FEE_ZRX_UNIT_AMOUNT = !_.isEmpty(process.env.MAKER_FEE_ZRX_UNIT_AMOUNT)
    ? new BigNumber(_.parseInt(process.env.MAKER_FEE_ZRX_UNIT_AMOUNT as string))
    : new BigNumber(0);
// A flat fee in ZRX that should be charged to the order taker
export const TAKER_FEE_ZRX_UNIT_AMOUNT = !_.isEmpty(process.env.TAKER_FEE_ZRX_UNIT_AMOUNT)
    ? new BigNumber(_.parseInt(process.env.TAKER_FEE_ZRX_UNIT_AMOUNT as string))
    : new BigNumber(0);
// Ethereum RPC url
export const RPC_URL = !_.isEmpty(process.env.RPC_URL) ? (process.env.RPC_URL as string) : 'https://kovan.infura.io/v3';
// Default ERC20 token precision
export const DEFAULT_ERC20_TOKEN_PRECISION = 18;

function getDefaultFeeRecipient(): string {
    const existingDefault: string = metadata.DEFAULT_FEE_RECIPIENT;
    const newDefault: string = existingDefault || `0xABCABC${crypto.randomBytes(17).toString('hex')}`;
    if (existingDefault === '') {
        const metadataCopy = JSON.parse(JSON.stringify(metadata));
        metadataCopy.DEFAULT_FEE_RECIPIENT = newDefault;
        fs.writeFileSync(metadataPath, JSON.stringify(metadataCopy));
    }
    return newDefault;
}
