import type { Branded, CustomMessage, Type } from '../interfaces';
import { SimpleType } from '../simple-type';
import { evalCustomMessage } from '../utils';

/**
 * Built-in validator for string-values.
 */
export const string: Type<string> = SimpleType.create(
    'string',
    'string',
    input => typeof input === 'string' || { kind: 'invalid basic type', expected: 'string' },
    { autoCaster: String },
);

export function pattern<BrandName extends string>(
    name: BrandName,
    regExp: RegExp,
    customMessage?: CustomMessage,
): Type<Branded<string, BrandName>> {
    return string.withConstraint(name, s => regExp.test(s) || evalCustomMessage(customMessage, s));
}
