import * as express from 'express';
import * as _ from 'lodash';

import { CHAIN_ID } from '../config';
import { ValidationError } from '../errors';

/**
 * Parses URL params and stores them on the request object
 */
export function urlParamsParsing(req: express.Request, _res: express.Response, next: express.NextFunction): void {
    const chainId = parseChainId(req.query.chainId);
    // HACK: This is the recommended way to pass data from middlewares on. It's not beautiful nor fully type-safe.
    (req as any).chainId = chainId;
    next();
}

function parseChainId(chainIdStrIfExists?: string): number {
    if (chainIdStrIfExists === undefined) {
        return CHAIN_ID;
    } else {
        const chainId = _.parseInt(chainIdStrIfExists);
        if (chainId !== CHAIN_ID) {
            const validationErrorItem = {
                field: 'chainId',
                code: 1004,
                reason: `Incorrect Chain ID: ${chainIdStrIfExists}`,
            };
            throw new ValidationError([validationErrorItem]);
        }
        return chainId;
    }
}
