import * as express from 'express';
import * as HttpStatus from 'http-status-codes';

import {
    BadRequestError,
    GeneralErrorCodes,
    generalErrorCodesReasons,
    RelayerBaseError,
    ValidationError,
} from '../errors';

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
            if (badRequestError.generalErrorCode === GeneralErrorCodes.VALIDATION_ERROR) {
                const validationError = badRequestError as ValidationError;
                const errorBody = {
                    code: badRequestError.generalErrorCode,
                    reason: generalErrorCodesReasons[badRequestError.generalErrorCode],
                    validationErrors: validationError.validationErrors,
                };
                res.status(relayerError.statusCode).send(errorBody);
            } else if (badRequestError.generalErrorCode === GeneralErrorCodes.MALFORMED_JSON) {
                const errorBody = {
                    code: badRequestError.generalErrorCode,
                    reason: generalErrorCodesReasons[badRequestError.generalErrorCode],
                };
                res.status(relayerError.statusCode).send(errorBody);
            }
        } else {
            const errorBody = {
                reason: HttpStatus.getStatusText(relayerError.statusCode),
            };
            res.status(relayerError.statusCode).send(errorBody);
        }
    } else {
        return next(err);
    }
}
