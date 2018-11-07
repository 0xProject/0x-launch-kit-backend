import { schemas as jsonSchemas } from '@0x/json-schemas';

import { assetPairsRequestOptsSchema } from './asset_pairs_request_opts_schema';
import { orderConfigRequestSchema } from './order_config_request_schema';
import { orderBookRequestSchema } from './orderbook_request_schema';
import { ordersRequestOptsSchema } from './orders_request_opts_schema';

export const schemas = {
    orderConfigRequestSchema,
    orderBookRequestSchema,
    ordersRequestOptsSchema,
    assetPairsRequestOptsSchema,
    ...jsonSchemas,
};
