import type { BaseTypeImpl } from './base-type';
import type { brands, designType } from './symbols';

/**
 * Verifies that a value conforms to a certain type / schema. If so, returns the (possibly converted) value,
 * correctly typed. Otherwise throws an exception.
 * @template ResultType the return-value of the checker
 */
export type Constructor<ResultType> = (input: unknown) => ResultType;

export type ConstraintFn<ResultType> = (
    input: ResultType,
    options: ValidationOptions,
) => boolean | string | string[] | FailureDetails | FailureDetails[];

export interface TypeLink<ResultType> {
    /**
     * The associated TypeScript-type of a Type.
     */
    readonly [designType]: ResultType;
}

export type Type<ResultType> = TypeImpl<BaseTypeImpl<ResultType>>;

export type TypeImpl<Impl extends BaseTypeImpl<any>> = Impl & Constructor<TypeOf<Impl>>;

/**
 * Obtains the TypeScript type of the given runtime Type-checker.
 * @alias The
 */
export type TypeOf<T> = T extends TypeLink<infer Q> ? Q : never;

/**
 * Obtains the TypeScript type of the given runtime Type-checker.
 * @alias TypeOf
 */
export type The<T> = TypeOf<T>;

/**
 * The result of a type validation.
 */
export type Result<T> = Success<T> | Failure;

/**
 * A successful validation result.
 */
export interface Success<T> {
    ok: true;

    /**
     * The original value, cast to its validated type.
     */
    value: T;
}

/**
 * A failed validation result.
 */
export interface Failure {
    ok: false;

    /**
     * The type that failed validation.
     */
    type: BaseTypeImpl<unknown>;

    /**
     * The input value.
     */
    value: unknown;

    /**
     * The details of the failure (at least one),
     */
    details: FailureDetails[];

    // prelude?: string;
}

export type FailureDetails = {
    /**
     * The name of the type that failed validation.
     */
    type: BaseTypeImpl<unknown>;

    /**
     * The input value.
     */
    value: unknown;

    /**
     * A key indicating the location at which validation failed.
     */
    path?: PropertyKey[];

    /**
     * A message describing some context to what part of the type generated the failure.
     */
    context?: string;
} & (
    | { kind?: undefined }
    | { kind: 'missing property'; property: string }
    | { kind: 'invalid key'; property: string; failure: Failure }
    | { kind: 'invalid literal'; expected: LiteralValue | LiteralValue[] }
    | { kind: 'invalid basic type'; expected: BasicType | BasicType[]; expectedValue?: LiteralValue }
    | { kind: 'union'; failures: Failure[] }
    | { kind: 'custom message'; message: string }
);

export type Branded<T, BrandName extends string> = T extends WithBrands<infer Base, infer ExistingBrands>
    ? // Merge brands into a single object for (tooltip-)readability
      WithBrands<Base, BrandName | ExistingBrands>
    : WithBrands<T, BrandName>;

type WithBrands<T, BrandNames extends string> = T & { [brands]: { [P in BrandNames]: true } };

export type Unbranded<T> = T extends WithBrands<infer Base, any> ? Base : T;

export type Properties = Record<string, Type<unknown>>;

export type PropertiesInfo<Props extends Properties = Properties> = { [Key in keyof Props]: { partial: boolean; type: Props[Key] } };

export type TypeOfProperties<T extends Properties> = { [P in keyof T]: TypeOf<T[P]> };

export type Writable<T> = { -readonly [P in keyof T]: T[P] };

export type ValidationMode = 'check' | 'construct';

export interface ValidationOptions {
    /** @internal */
    visited?: Map<unknown, Map<unknown, Result<unknown>>>;
    mode: ValidationMode;
}

export type LiteralValue = string | number | boolean | null | undefined | void;

export type BasicType = 'string' | 'number' | 'bigint' | 'boolean' | 'function' | 'object' | 'array' | 'symbol' | 'undefined' | 'null';

export type Overwrite<T extends Record<string, unknown>, U extends Record<string, unknown>> = {
    [K in keyof T]: K extends keyof U ? U[K] : T[K];
};

export type MergeIntersection<T> = T extends Record<PropertyKey, unknown> ? { [P in keyof T]: MergeIntersection<T[P]> } : T;

export type OneOrMore<T> = [T, ...T[]];
