'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const _0x_js_1 = require('0x.js');
const utils_1 = require('@0x/utils');
const config_1 = require('../config');
const mesh_adapter_1 = require('./mesh_adapter');
const order_watcher_adapter_1 = require('./order_watcher_adapter');
exports.OrderWatchersFactory = {
    build() {
        const adapter = config_1.USE_MESH
            ? exports.OrderWatchersFactory.buildMesh()
            : exports.OrderWatchersFactory.buildOrderWatcher();
        return adapter;
    },
    buildOrderWatcher() {
        const provider = new _0x_js_1.Web3ProviderEngine();
        provider.addProvider(new _0x_js_1.RPCSubprovider(config_1.RPC_URL));
        utils_1.providerUtils.startProviderEngine(provider);
        const contractWrappers = new _0x_js_1.ContractWrappers(provider, {
            networkId: config_1.NETWORK_ID,
        });
        const adapter = new order_watcher_adapter_1.OrderWatcherAdapter(
            provider,
            config_1.NETWORK_ID,
            contractWrappers,
        );
        return adapter;
    },
    buildMesh() {
        const adapter = new mesh_adapter_1.MeshAdapter();
        return adapter;
    },
};
