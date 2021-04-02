import type { Branded, CustomMessage, Type } from '../interfaces';
import { SimpleType } from '../simple-type';
import { basicTypeChecker, evalCustomMessage } from '../utils';

/**
 * Built-in validator for string-values.
 */
export const string: Type<string> = SimpleType.create('string', 'string', basicTypeChecker('string'), { autoCaster: String });

export function pattern<BrandName extends string>(
    name: BrandName,
    regExp: RegExp,
    customMessage?: CustomMessage,
): Type<Branded<string, BrandName>> {
    return string.withConstraint(name, s => regExp.test(s) || evalCustomMessage(customMessage, s));
}
