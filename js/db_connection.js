'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const typeorm_1 = require('typeorm');
let connectionIfExists;
/**
 * Returns the DB connnection
 */
function getDBConnection() {
    if (connectionIfExists === undefined) {
        throw new Error('DB connection not initialized');
    }
    return connectionIfExists;
}
exports.getDBConnection = getDBConnection;
/**
 * Creates the DB connnection to use in an app
 */
async function initDBConnectionAsync() {
    if (connectionIfExists !== undefined) {
        throw new Error('DB connection already exists');
    }
    connectionIfExists = await typeorm_1.createConnection();
}
exports.initDBConnectionAsync = initDBConnectionAsync;
