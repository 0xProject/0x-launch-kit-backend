#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const contract_addresses_1 = require("@0x/contract-addresses");
const order_utils_1 = require("@0x/order-utils");
const utils_1 = require("@0x/utils");
const config_1 = require("../config");
const utils_2 = require("../utils");
(async () => {
    const addresses = contract_addresses_1.getContractAddressesForNetworkOrThrow(config_1.NETWORK_ID);
    const order = {
        exchangeAddress: addresses.exchange,
        makerAddress: maker,
        takerAddress: NULL_ADDRESS,
        senderAddress: NULL_ADDRESS,
        feeRecipientAddress: config_1.FEE_RECIPIENT,
        // tslint:disable-next-line:custom-no-magic-numbers
        expirationTimeSeconds: new utils_1.BigNumber(Date.now() + 24 * 60 * 60),
        salt: order_utils_1.generatePseudoRandomSalt(),
        makerAssetAmount,
        takerAssetAmount,
        makerAssetData,
        takerAssetData,
        makerFee: ZERO,
        takerFee: ZERO,
    };
    process.exit(0);
})().catch(err => {
    utils_2.utils.log(err);
    process.exit(1);
});
