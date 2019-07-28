'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const json_schemas_1 = require('@0x/json-schemas');
const _ = require('lodash');
const errors_1 = require('./errors');
const schemaValidator = new json_schemas_1.SchemaValidator();
exports.utils = {
    log: (...args) => {
        // tslint:disable-next-line:no-console
        console.log(...args);
    },
    validateSchema(instance, schema) {
        const validationResult = schemaValidator.validate(instance, schema);
        if (_.isEmpty(validationResult.errors)) {
            return;
        } else {
            const validationErrorItems = _.map(validationResult.errors, schemaValidationError =>
                schemaValidationErrorToValidationErrorItem(schemaValidationError),
            );
            throw new errors_1.ValidationError(validationErrorItems);
        }
    },
    async delayAsync(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    async attemptAsync(fn, opts = { interval: 1000, maxRetries: 10 }) {
        let result;
        let attempt = 0;
        let error;
        while (!result && attempt < opts.maxRetries) {
            attempt++;
            try {
                result = await fn();
            } catch (err) {
                exports.utils.log(new Date(), attempt, err.message);
                error = err;
                await exports.utils.delayAsync(opts.interval);
            }
        }
        if (result) {
            return result;
        }
        throw error;
    },
};
function schemaValidationErrorToValidationErrorItem(schemaValidationError) {
    if (
        _.includes(
            [
                'type',
                'anyOf',
                'allOf',
                'oneOf',
                'additionalProperties',
                'minProperties',
                'maxProperties',
                'pattern',
                'format',
                'uniqueItems',
                'items',
                'dependencies',
            ],
            schemaValidationError.name,
        )
    ) {
        return {
            field: schemaValidationError.property,
            code: errors_1.ValidationErrorCodes.IncorrectFormat,
            reason: schemaValidationError.message,
        };
    } else if (
        _.includes(
            ['minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'enum', 'const'],
            schemaValidationError.name,
        )
    ) {
        return {
            field: schemaValidationError.property,
            code: errors_1.ValidationErrorCodes.ValueOutOfRange,
            reason: schemaValidationError.message,
        };
    } else if (schemaValidationError.name === 'required') {
        return {
            field: schemaValidationError.argument,
            code: errors_1.ValidationErrorCodes.RequiredField,
            reason: schemaValidationError.message,
        };
    } else if (schemaValidationError.name === 'not') {
        return {
            field: schemaValidationError.property,
            code: errors_1.ValidationErrorCodes.UnsupportedOption,
            reason: schemaValidationError.message,
        };
    } else {
        throw new Error(`Unknnown schema validation error name: ${schemaValidationError.name}`);
    }
}
