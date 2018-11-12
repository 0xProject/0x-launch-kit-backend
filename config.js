export const config = {
    // Network port to listen on
    HTTP_PORT: 3000,
    // Default network id to use when not specified
    NETWORK_ID: 1,
    // An array of fee recipients
    FEE_RECIPIENTS: ['0x0000000000000000000000000000000000000000'],
    // Ethereum RPC url
    RPC_URL: 'https://mainnet.infura.io',
    // Tradable asset pairs
    ASSET_PAIRS: [
        {
            assetDataA: {
                minAmount: '0',
                maxAmount: '0',
                precision: 5,
                assetData: '0xf47261b04c32345ced77393b3530b1eed0f346429d',
            },
            assetDataB: {
                minAmount: '0',
                maxAmount: '0',
                precision: 5,
                assetData: '0x0257179264389b814a946f3e92105513705ca6b990',
            },
        },
    ],
    // A time window after which the order is considered permanently expired
    ORDER_SHADOWING_MARGIN_MS: 100000,
    // Frequency of checks for permanently expired orders
    PERMANENT_CLEANUP_INTERVAL_MS: 10000,
    // Max number of entities per page
    MAX_PER_PAGE: 100,
};
