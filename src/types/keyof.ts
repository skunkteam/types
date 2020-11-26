import { BaseTypeImpl, createType } from '../base-type';
import type { Branded, ConstraintFn, Result, TypeImpl } from '../interfaces';
import { decodeOptionalName, hasOwnProperty, transpose, Transposed } from '../utils';

export class KeyofType<T extends Record<string, unknown>, ResultType extends keyof T = keyof T> extends BaseTypeImpl<ResultType> {
    readonly basicType = 'string';

    constructor(
        readonly keys: T,
        readonly name = Object.keys(keys)
            .map(key => JSON.stringify(key))
            .join(' | '),
    ) {
        super();
    }

    readonly enumerableLiteralDomain = new Set(Object.keys(this.keys));

    typeValidator(value: unknown): Result<ResultType> {
        if (typeof value !== 'string') {
            return this.createResult(value, { type: this, kind: 'invalid basic type', expected: 'string', value });
        }
        return this.createResult(value, hasOwnProperty(this.keys, value));
    }

    translate(input: unknown): T[keyof T] {
        this.assert(input);
        return this.keys[input];
    }
}

export function keyof<T extends Record<string, unknown>>(...args: [name: string, keys: T] | [keys: T]): TypeImpl<KeyofType<T>> {
    const [name, keys] = decodeOptionalName(args);
    return createType(new KeyofType(keys, name));
}

export function valueof<T extends Record<string, string>>(...args: [name: string, obj: T] | [obj: T]): TypeImpl<KeyofType<Transposed<T>>> {
    const [name, obj] = decodeOptionalName(args);
    return createType(new KeyofType(transpose(obj), name));
}

// Repeated for every type implementation, because higher kinded types are currently not really supported in TypeScript.
// Known workarounds, such as: https://medium.com/@gcanti/higher-kinded-types-in-typescript-static-and-fantasy-land-d41c361d0dbe
// are problematic with regards to instance-methods (you are very welcome to try, though). Especially the following methods are
// difficult to get right using HKT:
export interface KeyofType<T, ResultType> {
    /**
     * Create a new instance of this Type with the given name. Creates a brand.
     *
     * @param name the new name to use in (some) error messages
     */
    withBrand<BrandName extends string>(name: BrandName): TypeImpl<KeyofType<T, Branded<ResultType, BrandName>>>;

    /**
     * Use an arbitrary constraint function to further restrict a type.
     */
    withConstraint<BrandName extends string>(
        name: BrandName,
        constraint: ConstraintFn<ResultType>,
    ): TypeImpl<KeyofType<T, Branded<ResultType, BrandName>>>;
}
