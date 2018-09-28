import * as bodyParser from 'body-parser';
import * as express from 'express';

import { HTTP_PORT } from './config';
import { handlers } from './handlers';
import { errorHandler } from './middleware/error_handling';
import { urlParamsParsing } from './middleware/url_params_parsing';
import { utils } from './utils';

const app = express();
app.use(bodyParser.json());
app.use(urlParamsParsing);
/**
 * GET AssetPairs endpoint retrieves a list of available asset pairs and the information required to trade them.
 * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getAssetPairs
 */
app.get('/v2/asset_pairs', handlers.assetPairs);
/**
 * GET Orders endpoint retrieves a list of orders given query parameters.
 * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrders
 */
app.get('/v2/orders', handlers.orders);
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
 * GET FeeRecepients endpoint retrieves a collection of all fee recipient addresses for a relayer.
 * http://sra-spec.s3-website-us-east-1.amazonaws.com/v2/fee_recipients
 */
app.get('/v2/fee_recipients', handlers.feeRecipients);
/**
 * POST Order endpoint submits an order to the Relayer.
 * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/postOrder
 */
app.post('/v2/order', handlers.postOrder);
/**
 * GET Order endpoint retrieves the order by order hash.
 * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrder
 */
app.get('/v2/order/:orderHash', handlers.getOrderByHash);

app.use(errorHandler);

app.listen(HTTP_PORT, () => utils.log(`Standard relayer API (HTTP) listening on port ${HTTP_PORT}!`));
