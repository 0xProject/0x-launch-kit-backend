import { PaginatedCollection } from '@0xproject/connect';

// TODO(leo) Parse request query params and do proper pagination
/**
 * Paginates the collection and returns the paginated response
 * @param records Collection to paginate
 */
export function paginate<T>(records: T[]): PaginatedCollection<T> {
    return { total: records.length, records, page: 1, perPage: 100 };
}
