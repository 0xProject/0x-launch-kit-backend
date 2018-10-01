// tslint:disable:max-classes-per-file
export abstract class RelayerBaseError extends Error {
    public abstract statusCode: number;
    public isRelayerError = true;
}

export abstract class BadRequestError extends RelayerBaseError {
    public statusCode = 400;
    public abstract generalErrorCode: GeneralErrorCodes;
}

export interface ValidationErrorItem {
    field: string;
    code: ValidationErrorCodes;
    reason: string;
}

export class ValidationError extends BadRequestError {
    public generalErrorCode = GeneralErrorCodes.validationError;
    public validationErrors: ValidationErrorItem[];
    constructor(validationErrors: ValidationErrorItem[]) {
        super();
        this.validationErrors = validationErrors;
    }
}

export class MalformedJSONError extends BadRequestError {
    public generalErrorCode = GeneralErrorCodes.malformedJson;
}

export class NotFoundError extends RelayerBaseError {
    public statusCode = 404;
}

export class TooManyRequestsError extends RelayerBaseError {
    public statusCode = 429;
    public generalErrorCode = GeneralErrorCodes.throttled;
}

export class InternalServerError extends RelayerBaseError {
    public statusCode = 500;
}

export class NotImplementedError extends RelayerBaseError {
    public statusCode = 501;
}

export enum GeneralErrorCodes {
    validationError = 100,
    malformedJson = 101,
    orderSubmittionDisabled = 102,
    throttled = 103,
}

export const generalErrorCodeToReason: { [key in GeneralErrorCodes]: string } = {
    [GeneralErrorCodes.validationError]: 'Validation Failed',
    [GeneralErrorCodes.malformedJson]: 'Malformed JSON',
    [GeneralErrorCodes.orderSubmittionDisabled]: 'Order submission disabled',
    [GeneralErrorCodes.throttled]: 'Throttled',
};

export enum ValidationErrorCodes {
    requiredField = 1000,
    incorrectFormat = 1001,
    invalidAddress = 1002,
    addressNotSupported = 1003,
    valueOutOfRange = 1004,
    invalidSignatureOrHash = 1005,
    unsupportedOption = 1006,
}
