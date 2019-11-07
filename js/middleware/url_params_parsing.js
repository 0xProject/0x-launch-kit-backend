'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
var _ = require('lodash');
var config_1 = require('../config');
var errors_1 = require('../errors');
/**
 * Parses URL params and stores them on the request object
 */
function urlParamsParsing(req, _res, next) {
    var chainId = parseChainId(req.query.chainId);
    // HACK: This is the recommended way to pass data from middlewares on. It's not beautiful nor fully type-safe.
    req.chainId = chainId;
    next();
}
exports.urlParamsParsing = urlParamsParsing;
function parseChainId(chainIdStrIfExists) {
    if (chainIdStrIfExists === undefined) {
        return config_1.CHAIN_ID;
    } else {
        var chainId = _.parseInt(chainIdStrIfExists);
        if (chainId !== config_1.CHAIN_ID) {
            var validationErrorItem = {
                field: 'chainId',
                code: 1004,
                reason: 'Incorrect Chain ID: ' + chainIdStrIfExists,
            };
            throw new errors_1.ValidationError([validationErrorItem]);
        }
        return chainId;
    }
}
