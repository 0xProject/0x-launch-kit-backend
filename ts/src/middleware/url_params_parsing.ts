import * as express from 'express';
import * as _ from 'lodash';

import { DEFAULT_NETWORK_ID } from '../config';
import { ValidationError } from '../errors';

/**
 * Parses URL params and stores them on the request object
 */
export function urlParamsParsing(req: express.Request, _res: express.Response, next: express.NextFunction): void {
    const networkId = parseNetworkId(req.query.networkId);
    req.networkId = networkId;
    next();
}

function parseNetworkId(networkIdStrIfExists?: string): number {
    if (_.isUndefined(networkIdStrIfExists)) {
        return DEFAULT_NETWORK_ID;
    } else {
        const networkId = _.parseInt(networkIdStrIfExists);
        if (networkId !== DEFAULT_NETWORK_ID) {
            const validationErrorItem = {
                field: 'networkId',
                code: 1004,
                reason: `Incorrect Network ID: ${networkIdStrIfExists}`,
            };
            throw new ValidationError([validationErrorItem]);
        }
        return networkId;
    }
}
