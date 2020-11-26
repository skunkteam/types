import { BaseTypeImpl, createType } from '../base-type';
import type { Branded, ConstraintFn, Result, The, TypeImpl, Unbranded } from '../interfaces';
import { cachedInstance, printValue } from '../utils';
import { string } from './string';

export class NumberType<ResultType extends number = number> extends BaseTypeImpl<ResultType> {
    readonly name = 'number';
    readonly basicType = 'number';

    typeValidator(value: unknown): Result<ResultType> {
        if (typeof value !== 'number') {
            return this.createResult(value, { type: this, kind: 'invalid basic type', expected: 'number', value });
        }
        return this.createResult(value, !Number.isNaN(value));
    }

    get fromString(): this {
        return cachedInstance(this, 'fromString', () =>
            this.withConstructor(
                `${this.name}.fromString`,
                string.andThen(s => toNumber<ResultType>(s)),
            ),
        );
    }

    get fromUnknown(): this {
        return cachedInstance(this, 'fromUnknown', () => this.withConstructor(`${this.name}.fromUnknown`, s => toNumber<ResultType>(s)));
    }
}

export const number: TypeImpl<NumberType> = createType(new NumberType());

export type int = The<typeof int>;
export const int: TypeImpl<NumberType<Branded<number, 'int'>>> = number.withConstraint('int', Number.isInteger);

function toNumber<T extends number>(value: unknown): Unbranded<T> {
    const result = value === '' ? NaN : +String(value);
    if (Number.isNaN(result)) {
        throw `could not convert value to number: ${printValue(value)}`;
    }
    return result as Unbranded<T>;
}

export interface NumberType<ResultType> {
    /**
     * Create a new instance of this Type with the given name. Creates a brand.
     *
     * @param name the new name to use in (some) error messages
     */
    withBrand<BrandName extends string>(name: BrandName): TypeImpl<NumberType<Branded<ResultType, BrandName>>>;

    /**
     * Use an arbitrary constraint function to further restrict a type.
     */
    withConstraint<BrandName extends string>(
        name: BrandName,
        constraint: ConstraintFn<ResultType>,
    ): TypeImpl<NumberType<Branded<ResultType, BrandName>>>;
}
