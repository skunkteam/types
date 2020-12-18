import type { Branded, Type } from '../interfaces';
import { SimpleType } from '../simple-type';

/**
 * Built-in validator for string-values.
 */
export const string: Type<string> = SimpleType.create(
    'string',
    'string',
    (type, input) => typeof input === 'string' || { type, kind: 'invalid basic type', expected: 'string', input },
    { autoCaster: String },
);

export function pattern<BrandName extends string>(
    name: BrandName,
    regExp: RegExp,
    customMessage: string | false = false,
): Type<Branded<string, BrandName>> {
    return string.withConstraint(name, s => regExp.test(s) || customMessage);
}
