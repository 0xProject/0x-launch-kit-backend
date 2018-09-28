"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const config_1 = require("../config");
const errors_1 = require("../errors");
function urlParamsParsing(req, _res, next) {
    const networkId = parseNetworkId(req.query.networkId);
    req.networkId = networkId;
    next();
}
exports.urlParamsParsing = urlParamsParsing;
function parseNetworkId(networkIdStrIfExists) {
    if (_.isUndefined(networkIdStrIfExists)) {
        return config_1.NETWORK_ID;
    }
    else {
        const networkId = _.parseInt(networkIdStrIfExists);
        if (networkId !== config_1.NETWORK_ID) {
            const validationErroItem = {
                field: 'networkId',
                code: 1004,
                reason: `Incorrect Network ID: ${networkIdStrIfExists}`,
            };
            throw new errors_1.ValidationError([validationErroItem]);
        }
        return networkId;
    }
}
