import * as express from 'express';
import * as _ from 'lodash';

import { NETWORK_ID } from '../config';
import { ValidationError } from '../errors';

export function urlParamsParsing(req: express.Request, _res: express.Response, next: express.NextFunction): void {
    const networkId = parseNetworkId(req.query.networkId);
    req.networkId = networkId;
    next();
}

function parseNetworkId(networkIdStrIfExists?: string): number {
    if (_.isUndefined(networkIdStrIfExists)) {
        return NETWORK_ID;
    } else {
        const networkId = _.parseInt(networkIdStrIfExists);
        if (networkId !== NETWORK_ID) {
            const validationErroItem = {
                field: 'networkId',
                code: 1004,
                reason: `Incorrect Network ID: ${networkIdStrIfExists}`,
            };
            throw new ValidationError([validationErroItem]);
        }
        return networkId;
    }
}
