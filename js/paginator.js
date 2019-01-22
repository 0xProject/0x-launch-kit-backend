'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.paginate = (collection, page, perPage) => {
    const paginatedCollection = {
        total: collection.length,
        page,
        perPage,
        records: collection.slice((page - 1) * perPage, page * perPage),
    };
    return paginatedCollection;
};
