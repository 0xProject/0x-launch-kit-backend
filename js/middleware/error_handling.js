'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const HttpStatus = require('http-status-codes');
const errors_1 = require('../errors');
/**
 * Wraps an Error with a JSON human readable reason and status code.
 */
function generateError(err) {
    if (err.isRelayerError) {
        const relayerError = err;
        const statusCode = relayerError.statusCode;
        if (relayerError.statusCode === HttpStatus.BAD_REQUEST) {
            const badRequestError = relayerError;
            if (badRequestError.generalErrorCode === errors_1.GeneralErrorCodes.ValidationError) {
                const validationError = badRequestError;
                return {
                    statusCode,
                    errorBody: {
                        code: badRequestError.generalErrorCode,
                        reason: errors_1.generalErrorCodeToReason[badRequestError.generalErrorCode],
                        validationErrors: validationError.validationErrors,
                    },
                };
            } else if (badRequestError.generalErrorCode === errors_1.GeneralErrorCodes.MalformedJson) {
                return {
                    statusCode,
                    errorBody: {
                        code: badRequestError.generalErrorCode,
                        reason: errors_1.generalErrorCodeToReason[badRequestError.generalErrorCode],
                    },
                };
            }
        } else {
            return {
                statusCode,
                errorBody: {
                    reason: HttpStatus.getStatusText(relayerError.statusCode),
                },
            };
        }
    }
    return {
        statusCode: HttpStatus.BAD_REQUEST,
        errorBody: {
            reason: err.message,
        },
    };
}
exports.generateError = generateError;
/**
 * Catches errors thrown by our code and serialies them
 */
function errorHandler(err, _req, res, next) {
    // If you call next() with an error after you have started writing the response
    // (for example, if you encounter an error while streaming the response to the client)
    // the Express default error handler closes the connection and fails the request.
    if (res.headersSent) {
        return next(err);
    }
    if (err.isRelayerError) {
        const { statusCode, errorBody } = generateError(err);
        res.status(statusCode).send(errorBody);
        return;
    } else {
        return next(err);
    }
}
exports.errorHandler = errorHandler;
