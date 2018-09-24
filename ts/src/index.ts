import * as bodyParser from 'body-parser';
import * as express from 'express';

import { handlers } from './handlers';
import { utils } from './utils';

const HTTP_PORT = 3000;

// HTTP Server
const app = express();
app.use(bodyParser.json());
/**
 * GET Orderbook endpoint retrieves the orderbook for a given asset pair.
 * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrderbook
 */
app.get('/v2/orderbook', handlers.orderbook);
/**
 * GET Order config endpoint retrives the values for order fields that the relayer requires.
 * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrderConfig
 */
app.get('/v2/order_config', handlers.orderConfig);
/**
 * POST Order endpoint submits an order to the Relayer.
 * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/postOrder
 */
app.post('/v2/order', handlers.order);
app.listen(HTTP_PORT, () => utils.log(`Standard relayer API (HTTP) listening on port ${HTTP_PORT}!`));
