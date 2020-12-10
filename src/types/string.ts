import { BaseTypeImpl, createType } from '../base-type';
import type { Branded, Result, TypeImpl } from '../interfaces';

export class StringType<ResultType extends string = string> extends BaseTypeImpl<ResultType> {
    readonly name = 'string';
    readonly basicType = 'string';

    typeValidator(value: unknown): Result<ResultType> {
        return this.createResult(value, typeof value === 'string' || { type: this, kind: 'invalid basic type', expected: 'string', value });
    }

    withRegexpConstraint<BrandName extends string>(
        name: BrandName,
        regExp: RegExp,
    ): TypeImpl<BaseTypeImpl<Branded<ResultType, BrandName>>> {
        return this.withConstraint(name, s => regExp.test(s));
    }

    protected autoCaster = String;
}

export const string: TypeImpl<StringType> = createType(new StringType());
