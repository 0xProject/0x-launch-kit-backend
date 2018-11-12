'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const json_schemas_1 = require('@0x/json-schemas');
const asset_pairs_request_opts_schema_1 = require('./asset_pairs_request_opts_schema');
const order_config_request_schema_1 = require('./order_config_request_schema');
const orderbook_request_schema_1 = require('./orderbook_request_schema');
const orders_request_opts_schema_1 = require('./orders_request_opts_schema');
exports.schemas = {
    orderConfigRequestSchema: order_config_request_schema_1.orderConfigRequestSchema,
    orderBookRequestSchema: orderbook_request_schema_1.orderBookRequestSchema,
    ordersRequestOptsSchema: orders_request_opts_schema_1.ordersRequestOptsSchema,
    assetPairsRequestOptsSchema: asset_pairs_request_opts_schema_1.assetPairsRequestOptsSchema,
    ...json_schemas_1.schemas,
};
