import { BaseTypeImpl, createType } from '../base-type';
import type { Branded, ConstraintFn, Result, TypeImpl } from '../interfaces';
import { isObject } from '../utils';

export class UnknownType<ResultType = unknown> extends BaseTypeImpl<ResultType> {
    readonly name = 'unknown';
    readonly basicType = 'mixed';

    typeValidator(value: unknown): Result<ResultType> {
        return this.createResult(value, true);
    }
}

export class UnknownRecordType<ResultType extends Record<string, unknown> = Record<string, unknown>> extends BaseTypeImpl<ResultType> {
    readonly name = 'Record<string, unknown>';
    readonly basicType = 'object';

    typeValidator(value: unknown): Result<ResultType> {
        return this.createResult(value, isObject(value) || { type: this, value, kind: 'invalid basic type', expected: 'object' });
    }
}

export class UnknownArrayType<ResultType extends unknown[] = unknown[]> extends BaseTypeImpl<ResultType> {
    readonly name = 'unknown[]';
    readonly basicType = 'array';

    typeValidator(value: unknown): Result<ResultType> {
        return this.createResult(value, Array.isArray(value) || { type: this, value, kind: 'invalid basic type', expected: 'array' });
    }
}

export const unknown: TypeImpl<UnknownType> = createType(new UnknownType());
export const unknownRecord: TypeImpl<UnknownRecordType> = createType(new UnknownRecordType());
export const unknownArray: TypeImpl<UnknownArrayType> = createType(new UnknownArrayType());

// Repeated for every type implementation, because higher kinded types are currently not really supported in TypeScript.
// Known workarounds, such as: https://medium.com/@gcanti/higher-kinded-types-in-typescript-static-and-fantasy-land-d41c361d0dbe
// are problematic with regards to instance-methods (you are very welcome to try, though). Especially the following methods are
// difficult to get right using HKT:
export interface UnknownType<ResultType> {
    /**
     * Create a new instance of this Type with the given name. Creates a brand.
     *
     * @param name the new name to use in (some) error messages
     */
    withBrand<BrandName extends string>(name: BrandName): TypeImpl<UnknownType<Branded<ResultType, BrandName>>>;

    /**
     * Use an arbitrary constraint function to further restrict a type.
     */
    withConstraint<BrandName extends string>(
        name: BrandName,
        constraint: ConstraintFn<ResultType>,
    ): TypeImpl<UnknownType<Branded<ResultType, BrandName>>>;
}

export interface UnknownRecordType<ResultType> {
    /**
     * Create a new instance of this Type with the given name. Creates a brand.
     *
     * @param name the new name to use in (some) error messages
     */
    withBrand<BrandName extends string>(name: BrandName): TypeImpl<UnknownRecordType<Branded<ResultType, BrandName>>>;

    /**
     * Use an arbitrary constraint function to further restrict a type.
     */
    withConstraint<BrandName extends string>(
        name: BrandName,
        constraint: ConstraintFn<ResultType>,
    ): TypeImpl<UnknownRecordType<Branded<ResultType, BrandName>>>;
}

export interface UnknownArrayType<ResultType> {
    /**
     * Create a new instance of this Type with the given name. Creates a brand.
     *
     * @param name the new name to use in (some) error messages
     */
    withBrand<BrandName extends string>(name: BrandName): TypeImpl<UnknownArrayType<Branded<ResultType, BrandName>>>;

    /**
     * Use an arbitrary constraint function to further restrict a type.
     */
    withConstraint<BrandName extends string>(
        name: BrandName,
        constraint: ConstraintFn<ResultType>,
    ): TypeImpl<UnknownArrayType<Branded<ResultType, BrandName>>>;
}
