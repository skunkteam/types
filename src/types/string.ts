import { autoCastFailure } from '..';
import type { Branded, StringTypeConfig, Type } from '../interfaces';
import { SimpleType } from '../simple-type';
import { evalAdditionalChecks, stringStringify } from '../utils';

/**
 * Built-in validator for string-values.
 */
export const string: Type<string, StringTypeConfig> = SimpleType.create<string, StringTypeConfig>(
    'string',
    'string',
    (input, _, type) => {
        if (typeof input !== 'string') return { kind: 'invalid basic type', expected: 'string' };
        const { maxLength, minLength, pattern, customMessage } = type.typeConfig;
        return evalAdditionalChecks(
            {
                maxLength: maxLength == null || input.length <= maxLength,
                minLength: minLength == null || input.length >= minLength,
                pattern: pattern == null || pattern.test(input),
            },
            customMessage,
            input,
            violation =>
                violation === 'pattern'
                    ? { kind: 'pattern mismatch', config: type.typeConfig }
                    : { kind: 'length out of range', config: type.typeConfig, violation },
        );
    },
    {
        autoCaster: value => {
            switch (typeof value) {
                case 'bigint':
                case 'boolean':
                case 'number':
                case 'string':
                    return value.toString();
                default:
                    return autoCastFailure;
            }
        },
        typeConfig: {},
        acceptVisitor: (type, visitor) => visitor.visitStringType(type),
        maybeStringify: stringStringify,
    },
);

export function pattern<const BrandName extends string>(
    name: BrandName,
    regExp: RegExp,
    customMessage?: StringTypeConfig['customMessage'],
): Type<Branded<string, BrandName>, StringTypeConfig> {
    return string.withConfig(name, { pattern: regExp, customMessage });
}
