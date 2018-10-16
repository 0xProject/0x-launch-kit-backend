'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
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
        this.generalErrorCode = GeneralErrorCodes.validationError;
        this.validationErrors = validationErrors;
    }
}
exports.ValidationError = ValidationError;
class MalformedJSONError extends BadRequestError {
    constructor() {
        super(...arguments);
        this.generalErrorCode = GeneralErrorCodes.malformedJson;
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
        this.generalErrorCode = GeneralErrorCodes.throttled;
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
(function(GeneralErrorCodes) {
    GeneralErrorCodes[(GeneralErrorCodes['validationError'] = 100)] = 'validationError';
    GeneralErrorCodes[(GeneralErrorCodes['malformedJson'] = 101)] = 'malformedJson';
    GeneralErrorCodes[(GeneralErrorCodes['orderSubmittionDisabled'] = 102)] = 'orderSubmittionDisabled';
    GeneralErrorCodes[(GeneralErrorCodes['throttled'] = 103)] = 'throttled';
})((GeneralErrorCodes = exports.GeneralErrorCodes || (exports.GeneralErrorCodes = {})));
exports.generalErrorCodeToReason = {
    [GeneralErrorCodes.validationError]: 'Validation Failed',
    [GeneralErrorCodes.malformedJson]: 'Malformed JSON',
    [GeneralErrorCodes.orderSubmittionDisabled]: 'Order submission disabled',
    [GeneralErrorCodes.throttled]: 'Throttled',
};
var ValidationErrorCodes;
(function(ValidationErrorCodes) {
    ValidationErrorCodes[(ValidationErrorCodes['requiredField'] = 1000)] = 'requiredField';
    ValidationErrorCodes[(ValidationErrorCodes['incorrectFormat'] = 1001)] = 'incorrectFormat';
    ValidationErrorCodes[(ValidationErrorCodes['invalidAddress'] = 1002)] = 'invalidAddress';
    ValidationErrorCodes[(ValidationErrorCodes['addressNotSupported'] = 1003)] = 'addressNotSupported';
    ValidationErrorCodes[(ValidationErrorCodes['valueOutOfRange'] = 1004)] = 'valueOutOfRange';
    ValidationErrorCodes[(ValidationErrorCodes['invalidSignatureOrHash'] = 1005)] = 'invalidSignatureOrHash';
    ValidationErrorCodes[(ValidationErrorCodes['unsupportedOption'] = 1006)] = 'unsupportedOption';
})((ValidationErrorCodes = exports.ValidationErrorCodes || (exports.ValidationErrorCodes = {})));
//# sourceMappingURL=errors.js.map
