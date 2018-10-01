import * as express from 'express';
import * as HttpStatus from 'http-status-codes';

import {
    BadRequestError,
    GeneralErrorCodes,
    generalErrorCodeToReason,
    RelayerBaseError,
    ValidationError,
} from '../errors';

/**
 * Catches errors thrown by our code and serialies them
 */
export function errorHandler(
    err: Error,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
): void {
    // If you call next() with an error after you have started writing the response
    // (for example, if you encounter an error while streaming the response to the client)
    // the Express default error handler closes the connection and fails the request.
    if (res.headersSent) {
        return next(err);
    }
    if ((err as any).isRelayerError) {
        const relayerError = err as RelayerBaseError;
        if (relayerError.statusCode === HttpStatus.BAD_REQUEST) {
            const badRequestError = relayerError as BadRequestError;
            if (badRequestError.generalErrorCode === GeneralErrorCodes.validationError) {
                const validationError = badRequestError as ValidationError;
                const errorBody = {
                    code: badRequestError.generalErrorCode,
                    reason: generalErrorCodeToReason[badRequestError.generalErrorCode],
                    validationErrors: validationError.validationErrors,
                };
                res.status(relayerError.statusCode).send(errorBody);
                return;
            } else if (badRequestError.generalErrorCode === GeneralErrorCodes.malformedJson) {
                const errorBody = {
                    code: badRequestError.generalErrorCode,
                    reason: generalErrorCodeToReason[badRequestError.generalErrorCode],
                };
                res.status(relayerError.statusCode).send(errorBody);
                return;
            }
        } else {
            const errorBody = {
                reason: HttpStatus.getStatusText(relayerError.statusCode),
            };
            res.status(relayerError.statusCode).send(errorBody);
            return;
        }
    } else {
        return next(err);
    }
}
