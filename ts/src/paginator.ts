export const paginate = <T>(collection: T[], page: number, perPage: number) => {
    const paginatedCollection = {
        total: collection.length,
        page,
        perPage,
        records: collection.slice(page * perPage, (page + 1) * perPage),
    };
    return paginatedCollection;
};
