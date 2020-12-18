import type { Type } from '../interfaces';
import { SimpleType } from '../simple-type';
import { autoCastFailure } from '../symbols';

/**
 * Built-in validator for boolean-values.
 */
export const boolean: Type<boolean> = SimpleType.create(
    'boolean',
    'boolean',
    (type, input) => typeof input === 'boolean' || { type, kind: 'invalid basic type', expected: 'boolean', input },
    { autoCaster: booleanAutoCaster, enumerableLiteralDomain: [true, false] },
);

export function booleanAutoCaster(input: unknown): boolean | typeof autoCastFailure {
    switch (input) {
        case true:
        case 'true':
        case 1:
            return true;
        case false:
        case 'false':
        case 0:
            return false;
        default:
            return autoCastFailure;
    }
}
