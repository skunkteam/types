import type { Type } from '../interfaces';
import { SimpleType } from '../simple-type';
import { autoCastFailure } from '../symbols';
import { basicTypeChecker, booleanStringify } from '../utils';

/**
 * Built-in validator for boolean-values.
 */
export const boolean: Type<boolean> = SimpleType.create('boolean', 'boolean', basicTypeChecker('boolean'), {
    autoCaster: booleanAutoCaster,
    enumerableLiteralDomain: [true, false],
    acceptVisitor: (type, visitor) => visitor.visitBooleanType(type),
    maybeStringify: booleanStringify,
});

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
