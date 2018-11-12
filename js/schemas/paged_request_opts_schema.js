"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pagedRequestOptsSchema = {
    id: '/PagedRequestOpts',
    type: 'object',
    properties: {
        page: { type: 'number' },
        perPage: { type: 'number' },
    },
};
