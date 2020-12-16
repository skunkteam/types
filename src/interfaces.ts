import type { BaseTypeImpl } from './base-type';
import type { brands, designType } from './symbols';

/**
 * A type-validator/-parser that validates or parses `ResultType`.
 *
 * @remarks
 * This is the most generic interface that describes a type. It does not provide
 * access to type-specific utilities / properties. Use {@link TypeImpl} for an interface that describes the actual Type implementation.
 */
export type Type<ResultType> = TypeImpl<BaseTypeImpl<ResultType>>;

/**
 * The possible return values inside validation and constraint functions.
 */
export type ValidationResult = boolean | string | string[] | FailureDetails | FailureDetails[];

/**
 * The validation-logic as needed by {@link BaseTypeImpl.withConstraint} and {@link BaseTypeImpl.withValidation}.
 */
export type Validator<ResultType> = (input: ResultType, options: ValidationOptions) => ValidationResult;

/**
 * An object that has an associated TypeScript type.
 */
export interface TypeLink<AssociatedType> {
    /**
     * The associated TypeScript-type of the current object.
     */
    readonly [designType]: AssociatedType;
}

/**
 * The Type with the given type implementation.
 *
 * @remarks
 * Adds both constructor and regular function to the signature to make sure TypeScript will emit
 * the type as decorator metadata.
 */
export type TypeImpl<Impl extends BaseTypeImpl<any>> = Impl & {
    // Constructor is needed to ensure TypeScript will emit this type as decorator-metadata
    new (input: unknown): TypeOf<Impl>;
    (input: unknown): TypeOf<Impl>;
};

/**
 * Obtains the TypeScript type of the given runtime Type-checker. Aka {@link The}.
 */
export type TypeOf<T> = T extends TypeLink<infer Q> ? Q : never;

/**
 * Obtains the TypeScript type of the given runtime Type-checker. Aka {@link TypeOf}.
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
     * The original value, cast or parsed to its validated type.
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
    input: unknown;

    /**
     * The details of the failure (at least one),
     */
    details: OneOrMore<FailureDetails>;
}

export type FailureDetails = {
    /**
     * The name of the type that failed validation.
     *
     * @remarks
     * With the only exception: when the FailureDetails has `kind: 'missing property'` in which case `type` mentions the expected type of the property, not the
     * type that failed validation (which is the parent type).
     */
    type: BaseTypeImpl<unknown>;

    /**
     * The input value that failed the validation.
     */
    input: unknown;

    /**
     * The value input value to the parser, if applicable.
     *
     * @remarks
     * Note that a parser is applied first, yielding the input to the validator, which is then validated. So this is, when given, the real user-input.
     */
    parserInput?: unknown;

    /**
     * A array of keys indicating the location at which validation failed.
     */
    path?: PropertyKey[];

    /**
     * A message describing some context to what part of the type generated the failure.
     *
     * @remarks
     * This libarary uses the contexts: `parser`, `precondition`, and `base type`, but consuming code is welcome to use any string as context.
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

/**
 * Create a Branded type with a given `BrandName`.
 *
 * @remarks
 * In order for TypeScript to consider a type seperate from another type, we need to brand it. When a type is branded TypeScript will
 * manage correct assignability during TypeScript-compilation, e.g. `int` is assignable to `number`, but `number` is not assignable to
 * `int`.
 */
export type Branded<T, BrandName extends string> = T extends WithBrands<infer Base, infer ExistingBrands>
    ? // Merge brands into a single object for (tooltip-)readability
      WithBrands<Base, BrandName | ExistingBrands>
    : WithBrands<T, BrandName>;

export type WithBrands<T, BrandNames extends string> = T & { [brands]: { [P in BrandNames]: true } };

/** Unbrand a given type (not recursive). */
export type Unbranded<T> = T extends WithBrands<infer Base, any> ? Base : T;

/**
 * The properties of an object type.
 *
 * @remarks
 * This is a mapping from string-keys to type-validators. During compilation this object is automatically converted into a proper TypeScript type for
 * static analysis by the compiler.
 */
export type Properties = Record<string, Type<unknown>>;

/**
 * Properties of an object type, including per-property optionality.
 */
export type PropertiesInfo<Props extends Properties = Properties> = { [Key in keyof Props]: { partial: boolean; type: Props[Key] } };

/**
 * Translates the type of a Properties-object into the proper TypeScript type to be used in user-code.
 */
export type TypeOfProperties<T extends Properties> = { [P in keyof T]: TypeOf<T[P]> };

/**
 * The opposite of the built-in `Readonly<...>` type.
 */
export type Writable<T> = { -readonly [P in keyof T]: T[P] };

/**
 * The validation mode to use.
 *
 * @remarks
 * Used by {@link BaseTypeImpl.validate}.
 *
 * - `'check'`: Only validate, no auto-casting or parsing performed
 *
 * - `'construct'`: First parse (if applicable), then valdate and return the result of the parsing step when succesful.
 */
export type ValidationMode = 'check' | 'construct';

export interface ValidationOptions {
    /** @internal */
    visited?: Map<unknown, Map<unknown, Result<unknown>>>;
    mode: ValidationMode;
}

/** The supported types of literals. */
export type LiteralValue = string | number | boolean | null | undefined | void;

/**
 * Basic categories of types.
 *
 * @remarks
 * Mostly follows the result of the `typeof` operator, with two exceptions:
 *
 * - `null` values are not reported as `object`, but have their own category: `null`
 *
 * - Arrays have their own category: `array`.
 */
export type BasicType = 'string' | 'number' | 'bigint' | 'boolean' | 'function' | 'object' | 'array' | 'symbol' | 'undefined' | 'null';

/**
 * Merge an intersection of types into one type, mostly for tooltip-readability in IDEs.
 */
export type MergeIntersection<T> = T extends Record<PropertyKey, unknown> ? { [P in keyof T]: MergeIntersection<T[P]> } : T;

/**
 * An Array with at least one element.
 */
export type OneOrMore<T> = [T, ...T[]];

export type Transposed<T extends Record<string, string>> = Record<T[keyof T], keyof T>;
