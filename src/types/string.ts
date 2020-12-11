import { BaseTypeImpl, createType } from '../base-type';
import type { Branded, Result, TypeImpl } from '../interfaces';
import { define } from '../utils';

/**
 * The implementation behind all sub-types of {@link string}.
 */
export class StringType<ResultType extends string = string> extends BaseTypeImpl<ResultType> {
    readonly name = 'string';
    readonly basicType!: 'string';

    typeValidator(value: unknown): Result<ResultType> {
        return this.createResult(
            value,
            value,
            typeof value === 'string' || { type: this, kind: 'invalid basic type', expected: 'string', value },
        );
    }

    withRegexpConstraint<BrandName extends string>(
        name: BrandName,
        regExp: RegExp,
    ): TypeImpl<BaseTypeImpl<Branded<ResultType, BrandName>>> {
        return this.withConstraint(name, s => regExp.test(s));
    }
}
define(StringType, 'autoCaster', String);
define(StringType, 'basicType', 'string');

/**
 * Built-in validator for string-values.
 *
 * @remarks
 * Can be sub-typed with {@link BaseTypeImpl.withConstraint}, and with the convenience method {@link StringType.withRegexpConstraint}.
 */
export const string: TypeImpl<StringType> = createType(new StringType());
