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
        this.generalErrorCode = GeneralErrorCodes.ValidationError;
        this.validationErrors = validationErrors;
    }
}
exports.ValidationError = ValidationError;
class MalformedJSONError extends BadRequestError {
    constructor() {
        super(...arguments);
        this.generalErrorCode = GeneralErrorCodes.MalformedJson;
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
        this.generalErrorCode = GeneralErrorCodes.Throttled;
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
    GeneralErrorCodes[GeneralErrorCodes["ValidationError"] = 100] = "ValidationError";
    GeneralErrorCodes[GeneralErrorCodes["MalformedJson"] = 101] = "MalformedJson";
    GeneralErrorCodes[GeneralErrorCodes["OrderSubmissionDisabled"] = 102] = "OrderSubmissionDisabled";
    GeneralErrorCodes[GeneralErrorCodes["Throttled"] = 103] = "Throttled";
})(GeneralErrorCodes = exports.GeneralErrorCodes || (exports.GeneralErrorCodes = {}));
exports.generalErrorCodeToReason = {
    [GeneralErrorCodes.ValidationError]: 'Validation Failed',
    [GeneralErrorCodes.MalformedJson]: 'Malformed JSON',
    [GeneralErrorCodes.OrderSubmissionDisabled]: 'Order submission disabled',
    [GeneralErrorCodes.Throttled]: 'Throttled',
};
var ValidationErrorCodes;
(function (ValidationErrorCodes) {
    ValidationErrorCodes[ValidationErrorCodes["RequiredField"] = 1000] = "RequiredField";
    ValidationErrorCodes[ValidationErrorCodes["IncorrectFormat"] = 1001] = "IncorrectFormat";
    ValidationErrorCodes[ValidationErrorCodes["InvalidAddress"] = 1002] = "InvalidAddress";
    ValidationErrorCodes[ValidationErrorCodes["AddressNotSupported"] = 1003] = "AddressNotSupported";
    ValidationErrorCodes[ValidationErrorCodes["ValueOutOfRange"] = 1004] = "ValueOutOfRange";
    ValidationErrorCodes[ValidationErrorCodes["InvalidSignatureOrHash"] = 1005] = "InvalidSignatureOrHash";
    ValidationErrorCodes[ValidationErrorCodes["UnsupportedOption"] = 1006] = "UnsupportedOption";
    ValidationErrorCodes[ValidationErrorCodes["InvalidOrder"] = 1007] = "InvalidOrder";
})(ValidationErrorCodes = exports.ValidationErrorCodes || (exports.ValidationErrorCodes = {}));
