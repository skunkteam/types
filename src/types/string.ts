import { BaseTypeImpl, createType } from '../base-type';
import type { Branded, ConstraintFn, Result, TypeImpl, Unbranded } from '../interfaces';
import { cachedInstance } from '../utils';

export class StringType<ResultType extends string = string> extends BaseTypeImpl<ResultType> {
    readonly name = 'string';
    readonly basicType = 'string';

    typeValidator(value: unknown): Result<ResultType> {
        return this.createResult(value, typeof value === 'string' || { type: this, kind: 'invalid basic type', expected: 'string', value });
    }

    withRegexpConstraint<BrandName extends string>(name: BrandName, regExp: RegExp): TypeImpl<StringType<Branded<ResultType, BrandName>>> {
        return this.withConstraint(name, s => regExp.test(s));
    }

    get fromUnknown(): this {
        return cachedInstance(this, 'fromUnknown', () =>
            this.withConstructor(`${this.name}.fromUnknown`, i => String(i) as Unbranded<ResultType>),
        );
    }
}

export const string: TypeImpl<StringType> = createType(new StringType());

// Repeated for every type implementation, because higher kinded types are currently not really supported in TypeScript.
// Known workarounds, such as: https://medium.com/@gcanti/higher-kinded-types-in-typescript-static-and-fantasy-land-d41c361d0dbe
// are problematic with regards to instance-methods (you are very welcome to try, though). Especially the following methods are
// difficult to get right using HKT:
export interface StringType<ResultType> {
    /**
     * Create a new instance of this Type with the given name. Creates a brand.
     *
     * @param name the new name to use in (some) error messages
     */
    withBrand<BrandName extends string>(name: BrandName): TypeImpl<StringType<Branded<ResultType, BrandName>>>;

    /**
     * Use an arbitrary constraint function to further restrict a type.
     */
    withConstraint<BrandName extends string>(
        name: BrandName,
        constraint: ConstraintFn<ResultType>,
    ): TypeImpl<StringType<Branded<ResultType, BrandName>>>;
}
