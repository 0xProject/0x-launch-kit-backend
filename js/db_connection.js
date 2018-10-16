'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const _ = require('lodash');
const typeorm_1 = require('typeorm');
let connectionIfExists;
function getDBConnection() {
    if (_.isUndefined(connectionIfExists)) {
        throw new Error('DB connection not initialized');
    }
    return connectionIfExists;
}
exports.getDBConnection = getDBConnection;
async function initDBConnectionAsync() {
    connectionIfExists = await typeorm_1.createConnection();
}
exports.initDBConnectionAsync = initDBConnectionAsync;
//# sourceMappingURL=db_connection.js.map
