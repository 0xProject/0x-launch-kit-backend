"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// TODO(leo) Parse request query params and do proper pagination
/**
 * Paginates the collection and returns the paginated response
 * @param records Collection to paginate
 */
function paginate(records) {
    return { total: records.length, records, page: 1, perPage: 100 };
}
exports.paginate = paginate;
