import { WSClient } from '@0x/mesh-rpc-client';
import * as express from 'express';
import 'reflect-metadata';

import * as config from './config';
import { initDBConnectionAsync } from './db_connection';
import { HttpService } from './services/http_service';
import { OrderWatcherService } from './services/order_watcher_service';
import { OrderBookService } from './services/orderbook_service';
import { WebsocketService } from './services/websocket_service';
import { utils } from './utils';

(async () => {
    await initDBConnectionAsync();
    const app = express();
    const server = app.listen(config.HTTP_PORT, () => {
        utils.log(
            `Standard relayer API (HTTP) listening on port ${config.HTTP_PORT}!\nConfig: ${JSON.stringify(
                config,
                null,
                2,
            )}`,
        );
    });
    let meshClient;
    await utils.attemptAsync(
        async () => {
            meshClient = new WSClient(config.MESH_ENDPOINT);
            await meshClient.getStatsAsync();
        },
        { interval: 3000, maxRetries: 10 },
    );
    if (!meshClient) {
        throw new Error('Unable to establish connection to Mesh');
    }
    utils.log('Connected to Mesh');
    const orderWatcherService = new OrderWatcherService(meshClient);
    await orderWatcherService.syncOrderbookAsync();
    // tslint:disable-next-line:no-unused-expression
    new WebsocketService(server, meshClient);
    const orderBookService = new OrderBookService(meshClient);
    // tslint:disable-next-line:no-unused-expression
    new HttpService(app, orderBookService);
})().catch(utils.log);
