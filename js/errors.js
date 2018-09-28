"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:max-classes-per-file
class RelayerBaseError extends Error {
    constructor() {
        super(...arguments);
        this.isRelayerError = true;
    }
}
exports.RelayerBaseError = RelayerBaseError;
class BadRequestError extends RelayerBaseError {
    constructor() {
        super(...arguments);
        this.statusCode = 400;
    }
}
exports.BadRequestError = BadRequestError;
class ValidationError extends BadRequestError {
    constructor(validationErrors) {
        super();
        this.generalErrorCode = GeneralErrorCodes.VALIDATION_ERROR;
        this.validationErrors = validationErrors;
    }
}
exports.ValidationError = ValidationError;
class MalformedJSONError extends BadRequestError {
    constructor() {
        super(...arguments);
        this.generalErrorCode = GeneralErrorCodes.MALFORMED_JSON;
    }
}
exports.MalformedJSONError = MalformedJSONError;
class NotFoundError extends RelayerBaseError {
    constructor() {
        super(...arguments);
        this.statusCode = 404;
    }
}
exports.NotFoundError = NotFoundError;
class TooManyRequestsError extends RelayerBaseError {
    constructor() {
        super(...arguments);
        this.statusCode = 429;
        this.generalErrorCode = GeneralErrorCodes.THROTTLED;
    }
}
exports.TooManyRequestsError = TooManyRequestsError;
class InternalServerError extends RelayerBaseError {
    constructor() {
        super(...arguments);
        this.statusCode = 500;
    }
}
exports.InternalServerError = InternalServerError;
class NotImplementedError extends RelayerBaseError {
    constructor() {
        super(...arguments);
        this.statusCode = 501;
    }
}
exports.NotImplementedError = NotImplementedError;
var GeneralErrorCodes;
(function (GeneralErrorCodes) {
    GeneralErrorCodes[GeneralErrorCodes["VALIDATION_ERROR"] = 100] = "VALIDATION_ERROR";
    GeneralErrorCodes[GeneralErrorCodes["MALFORMED_JSON"] = 101] = "MALFORMED_JSON";
    GeneralErrorCodes[GeneralErrorCodes["ORDER_SUBMISSION_DISABLED"] = 102] = "ORDER_SUBMISSION_DISABLED";
    GeneralErrorCodes[GeneralErrorCodes["THROTTLED"] = 103] = "THROTTLED";
})(GeneralErrorCodes = exports.GeneralErrorCodes || (exports.GeneralErrorCodes = {}));
exports.generalErrorCodesReasons = {
    [GeneralErrorCodes.VALIDATION_ERROR]: 'Validation Failed',
    [GeneralErrorCodes.MALFORMED_JSON]: 'Malformed JSON',
    [GeneralErrorCodes.ORDER_SUBMISSION_DISABLED]: 'Order submission disabled',
    [GeneralErrorCodes.THROTTLED]: 'Throttled',
};
var ValidationErrorCodes;
(function (ValidationErrorCodes) {
    ValidationErrorCodes[ValidationErrorCodes["REQUIRED_FIELD"] = 1000] = "REQUIRED_FIELD";
    ValidationErrorCodes[ValidationErrorCodes["INCORRECT_FORMAT"] = 1001] = "INCORRECT_FORMAT";
    ValidationErrorCodes[ValidationErrorCodes["INVALID_ADDRESS"] = 1002] = "INVALID_ADDRESS";
    ValidationErrorCodes[ValidationErrorCodes["ADDRESS_NOT_SUPPORTED"] = 1003] = "ADDRESS_NOT_SUPPORTED";
    ValidationErrorCodes[ValidationErrorCodes["VALUE_OUT_OF_RANGE"] = 1004] = "VALUE_OUT_OF_RANGE";
    ValidationErrorCodes[ValidationErrorCodes["INVALID_SIGNATURE_OR_HASH"] = 1005] = "INVALID_SIGNATURE_OR_HASH";
    ValidationErrorCodes[ValidationErrorCodes["UNSUPPORTED_OPTION"] = 1006] = "UNSUPPORTED_OPTION";
})(ValidationErrorCodes = exports.ValidationErrorCodes || (exports.ValidationErrorCodes = {}));
