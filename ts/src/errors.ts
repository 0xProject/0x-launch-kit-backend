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
    public generalErrorCode = GeneralErrorCodes.VALIDATION_ERROR;
    public validationErrors: ValidationErrorItem[];
    constructor(validationErrors: ValidationErrorItem[]) {
        super();
        this.validationErrors = validationErrors;
    }
}

export class MalformedJSONError extends BadRequestError {
    public generalErrorCode = GeneralErrorCodes.MALFORMED_JSON;
}

export class NotFoundError extends RelayerBaseError {
    public statusCode = 404;
}

export class TooManyRequestsError extends RelayerBaseError {
    public statusCode = 429;
    public generalErrorCode = GeneralErrorCodes.THROTTLED;
}

export class InternalServerError extends RelayerBaseError {
    public statusCode = 500;
}

export class NotImplementedError extends RelayerBaseError {
    public statusCode = 501;
}

export enum GeneralErrorCodes {
    VALIDATION_ERROR = 100,
    MALFORMED_JSON = 101,
    ORDER_SUBMISSION_DISABLED = 102,
    THROTTLED = 103,
}

export const generalErrorCodesReasons: { [key in GeneralErrorCodes]: string } = {
    [GeneralErrorCodes.VALIDATION_ERROR]: 'Validation Failed',
    [GeneralErrorCodes.MALFORMED_JSON]: 'Malformed JSON',
    [GeneralErrorCodes.ORDER_SUBMISSION_DISABLED]: 'Order submission disabled',
    [GeneralErrorCodes.THROTTLED]: 'Throttled',
};

export enum ValidationErrorCodes {
    REQUIRED_FIELD = 1000,
    INCORRECT_FORMAT = 1001,
    INVALID_ADDRESS = 1002,
    ADDRESS_NOT_SUPPORTED = 1003,
    VALUE_OUT_OF_RANGE = 1004,
    INVALID_SIGNATURE_OR_HASH = 1005,
    UNSUPPORTED_OPTION = 1006,
}
