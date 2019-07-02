import { ContractWrappers, RPCSubprovider, Web3ProviderEngine } from '0x.js';
import { providerUtils } from '@0x/utils';

import { NETWORK_ID, RPC_URL, USE_MESH } from '../config';

import { MeshAdapter } from './mesh_adapter';
import { OrderWatcherAdapter } from './order_watcher_adapter';

export const OrderWatchersFactory = {
    build(): OrderWatcherAdapter | MeshAdapter {
        const adapter = USE_MESH ? OrderWatchersFactory.buildMesh() : OrderWatchersFactory.buildOrderWatcher();
        return adapter;
    },
    buildOrderWatcher(): OrderWatcherAdapter {
        const provider = new Web3ProviderEngine();
        provider.addProvider(new RPCSubprovider(RPC_URL));
        providerUtils.startProviderEngine(provider);
        const contractWrappers = new ContractWrappers(provider, {
            networkId: NETWORK_ID,
        });
        const adapter = new OrderWatcherAdapter(provider, NETWORK_ID, contractWrappers);
        return adapter;
    },
    buildMesh(): MeshAdapter {
        const adapter = new MeshAdapter();
        return adapter;
    },
};
