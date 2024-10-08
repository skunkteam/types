import type { BaseObjectLikeTypeImpl, BaseTypeImpl } from './base-type';
import type { brands, designType } from './symbols';
import type { ArrayType, KeyofType, LiteralType, RecordType, UnionType } from './types';

/**
 * A type-validator/-parser that validates or parses `ResultType`.
 *
 * @remarks
 * This is the most generic interface that describes a type. It does not provide
 * access to type-specific utilities / properties. Use {@link TypeImpl} for an interface that describes the actual Type implementation.
 * `ResultType` can be any type, both scalar and object-like. Use `ObjectType<ResultType>` to restrict `ResultType` to object-like types.
 */
export type Type<ResultType, TypeConfig = unknown> = TypeImpl<BaseTypeImpl<ResultType, TypeConfig>>;

/**
 * A type-validator/-parser that validates or parses object-like type `ResultType`.
 *
 * @remarks
 * This is the most generic interface that describes an object-like type. It does not provide
 * access to type-specific utilities / properties. Use {@link TypeImpl} for an interface that describes the actual Type implementation.
 * Use `Type<ResultType>` to also allow scalar values for `ResultType`.
 */
export type ObjectType<ResultType, TypeConfig = unknown> = TypeImpl<BaseObjectLikeTypeImpl<ResultType, TypeConfig>>;

/**
 * The possible return values inside validation and constraint functions.
 *
 * @remarks
 * The validation is considered a success if the result is `true` or an empty array, anything else is considered to be a failure.
 */
export type ValidationResult = boolean | string | MessageDetails | Array<string | MessageDetails>;

/**
 * The type for optional custom messages
 *
 * @remarks
 * - When of type `string`, the custom message will be: `${customMessage}, got: ${got}`
 *
 * - When of type `function`, it will receive the `got` part to use inside the message.
 */
export type CustomMessage<T, E = void> = undefined | string | ((got: string, input: T, explanation: E) => string);

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
export type TypeImpl<Impl extends BaseTypeImpl<any, any>> = Impl & {
    // Constructor is needed to ensure TypeScript will emit this type as decorator-metadata
    new (input: unknown): TypeOf<Impl>;
    (this: void, input: unknown): TypeOf<Impl>;
};

/**
 * Obtains the TypeScript type of the given runtime Type-checker. Aka {@link The}.
 */
export type TypeOf<T> = T extends { readonly [designType]: infer Q } ? Q : never;

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

    /**
     * The value input value to the parser, if applicable.
     *
     * @remarks
     * Note that a parser is applied first, yielding the input to the validator, which is then validated. So this is, when given, the real user-input.
     */
    parserInput?: unknown;
}

/**
 * Individual message with info about the performed validation for error-reporting.
 */
export type FailureDetails = ValidationDetails & MessageDetails;

/**
 * Individual message details with optional info about the performed validation.
 */
export type MessageDetails = Partial<ValidationDetails> & {
    /**
     * A array of keys indicating the location at which validation failed.
     */
    path?: PropertyKey[];

    /**
     * A message describing some context to what part of the type generated the failure.
     *
     * @remarks
     * This library uses the contexts: `parser` and `precondition`, but consuming code is welcome to use any string as context.
     */
    context?: string;

    /**
     * Optionally omit the input after the message.
     *
     * @remarks
     * By default every message is followed by `", got: ..."` or `, got: ..., parsed from: ...`, unless this setting is set to `true`.
     */
    omitInput?: boolean;
} & (
        | { kind?: undefined }
        | { kind: 'missing property'; property: string }
        | { kind: 'invalid key'; property: string; failure: Failure }
        | { kind: 'invalid literal'; expected: LiteralValue | LiteralValue[] }
        | { kind: 'invalid basic type'; expected: BasicType | BasicType[]; expectedValue?: LiteralValue }
        | { kind: 'length out of range'; violation: LengthViolation; config: LengthChecksConfig }
        | { kind: 'input out of range'; violation: NumberViolation; config: NumberTypeConfig }
        | { kind: 'pattern mismatch'; config: StringTypeConfig }
        | { kind: 'union'; failures: Failure[] }
        | { kind: 'custom message'; message: string }
    );

/**
 * Information about the performed validation for error-reporting.
 */
export type ValidationDetails = {
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
};

/**
 * Create a Branded type with a given `BrandName`.
 *
 * @remarks
 * In order for TypeScript to consider a type separate from another type, we need to brand it. When a type is branded TypeScript will
 * manage correct assignability during TypeScript-compilation, e.g. `int` is assignable to `number`, but `number` is not assignable to
 * `int`.
 */
export type Branded<T, BrandName extends string> = T extends WithBrands<infer Base, infer ExistingBrands>
    ? // Merge brands into a single object for (tooltip-)readability
      WithBrands<Base, BrandName | ExistingBrands>
    : WithBrands<T, BrandName>;

export type WithBrands<T, BrandNames extends string> = T & { readonly [brands]: { [P in BrandNames]: true } };

/** Unbrand a given type (not recursive). */
export type Unbranded<T> = T extends WithBrands<infer Base, any> ? Base : T;

/** Unbrand a given type (recursive). */
export type DeepUnbranded<T> = T extends ReadonlyArray<unknown>
    ? { [P in keyof T & number]: DeepUnbranded<T[P]> }
    : T extends Record<string, unknown>
    ? Omit<{ [P in keyof T]: DeepUnbranded<T[P]> }, typeof brands>
    : Unbranded<T>;

/**
 * The properties of an object type.
 *
 * @remarks
 * This is a mapping from string-keys to type-validators. During compilation this object is automatically converted into a proper TypeScript type for
 * static analysis by the compiler.
 */
export type Properties = Record<string, Type<any>>;

/**
 * Information about a single property of an object-like type including its optionality.
 */
export type PropertyInfo<T extends Type<unknown> = Type<unknown>> = {
    partial: boolean;
    type: T;
};

/**
 * Properties of an object type, including per-property optionality.
 */
export type PropertiesInfo<Props extends Properties = Properties> = { [Key in keyof Props]: PropertyInfo<Props[Key]> };

/**
 * Translates the type of a Properties-object into the proper TypeScript type to be used in user-code.
 */
export type TypeOfProperties<T extends Properties> = { [P in keyof T]: MergeIntersection<TypeOf<T[P]>> };

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
 * - `'construct'`: First parse (if applicable), then validate and return the result of the parsing step when successful.
 */
export type ValidationMode = 'check' | 'construct';

export interface ValidationOptions {
    /** @internal */
    visited?: Map<unknown, Map<unknown, Result<unknown>>>;
    mode: ValidationMode;
}

/**
 * Options that can be passed to {@link BaseTypeImpl.withParser}.
 */
export interface ParserOptions {
    /**
     * The new name to use in error messages.
     */
    name?: string;
    /**
     * Whether to chain this parser on top of any existing parser.
     */
    chain?: boolean;
}

/** The supported types of literals. */
export type LiteralValue = string | number | boolean | null | undefined | void;

export type Primitive = LiteralValue | bigint | symbol;

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
export type MergeIntersection<T> = T extends Record<PropertyKey, unknown> ? Simplify<T> : T;

/**
 * Flatten the type output to improve type hints as shown in editors.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type Simplify<T> = { [P in keyof T]: T[P] } & {};

/**
 * The type of the type-guard that comes with each Type (the #is method).
 *
 * @remarks
 * Normally a typeguard wouldn't need the Input type-parameter, but this is needed for compatibility with `Array#every`. That method
 * requires the use of this type-param.
 */
export type TypeguardFor<ResultType> = <Input>(this: void, input: Input) => input is TypeguardResult<ResultType, Input>;

/**
 * The resulting type of a typeguard based on the `ResultType` of the Type and the given `Input`.
 */
export type TypeguardResult<ResultType, Input> =
    // TypeScript does not allow us to define the TypeGuardResult based on ResultType (in our case), so we need to base it on the Input itself.
    // If the input is unknown, we can fall back to basic typeguard result which is by far the best scenario.
    unknown extends Input
        ? Input & ResultType // <-- this is the best scenario, TypeScript needs to see `Input &` here, but `Input` is `unknown`, so it doesn't matter
        : // If Input is not unknown, we support two scenarios. It will never be really type-safe in all cases, but that is typeguards for you
        [Extract<Input, ResultType>] extends [never] // scenario 1: if we cannot identify elements of a union that look compatible...
        ? Input & ResultType // ... then let TypeScript try to figure it out, which often works, ...
        : Extract<Input, ResultType>; // ... otherwise pick those elements of the union and hope for the best.

/**
 * An Array with at least one element.
 */
export type OneOrMore<T> = [T, ...T[]];

export type Transposed<T extends Record<string, string>> = Record<T[keyof T], keyof T>;

/** The supported additional checks on numeric types. */
export type NumberViolation = 'min' | 'max' | 'multipleOf';

/** Configuration of additional checks on numeric types. */
export type NumberTypeConfig = {
    /**
     * A number is only valid if division by this value results in an integer.
     *
     * @remarks
     * Examples:
     *
     * - `multipleOf: 1` equals all integers.
     * - `multipleOf: 2` equals all even integers and zero.
     */
    multipleOf?: number;
    /**
     * Either a `CustomMessage` for all validations, or a `CustomMessage` per validation.
     *
     * @remarks
     * If a single function is provided, it receives a list of violated validations to further customize the error message.
     */
    customMessage?: CustomMessage<number, NumberViolation[]> | Partial<Record<NumberViolation, CustomMessage<number, NumberViolation>>>;
} & ({ minExclusive?: number; min?: undefined } | { minExclusive?: undefined; min?: number }) &
    ({ maxExclusive?: number; max?: undefined } | { maxExclusive?: undefined; max?: number });

export type LengthViolation = 'minLength' | 'maxLength';

export interface LengthChecksConfig {
    minLength?: number;
    maxLength?: number;
}

/** The supported additional checks on string types. */
export type StringViolation = 'pattern' | LengthViolation;

/** Configuration of additional checks on string types. */
export interface StringTypeConfig extends LengthChecksConfig {
    pattern?: RegExp;
    customMessage?: CustomMessage<string, StringViolation[]> | Partial<Record<StringViolation, CustomMessage<string, StringViolation>>>;
}

/** The supported additional checks on array types. */
export type ArrayViolation = LengthViolation;

/** Configuration of additional checks on array types. */
export interface ArrayTypeConfig extends LengthChecksConfig {
    customMessage?: CustomMessage<unknown[], ArrayViolation[]>;
}

/**
 * Interface for a visitor that is accepted by all types (classic visitor-pattern).
 */
export interface Visitor<R> {
    visitArrayType(type: ArrayType<BaseTypeImpl<unknown>, unknown, unknown[]>): R;
    visitBooleanType(type: BaseTypeImpl<boolean>): R;
    visitObjectLikeType(type: BaseObjectLikeTypeImpl<unknown>): R;
    visitKeyofType(type: KeyofType<Record<any, any>, any>): R;
    visitLiteralType(type: LiteralType<LiteralValue>): R;
    visitNumberType(type: BaseTypeImpl<number, NumberTypeConfig>): R;
    visitRecordType(type: RecordType<BaseTypeImpl<number | string>, number | string, BaseTypeImpl<unknown>, unknown>): R;
    visitStringType(type: BaseTypeImpl<string, StringTypeConfig>): R;
    visitUnionType(type: UnionType<OneOrMore<BaseTypeImpl<unknown>>, unknown>): R;
    visitUnknownType(type: BaseTypeImpl<unknown>): R;
    visitUnknownRecordType(type: BaseTypeImpl<Record<string, unknown>>): R;
    visitUnknownArrayType(type: BaseTypeImpl<unknown[]>): R;
    visitCustomType(type: BaseTypeImpl<unknown>): R;
}

/**
 * A description of the property-paths and possible values that might be used to identify this type inside a union.
 */
export type PossibleDiscriminator = {
    /** The property-path that points to a literal type that is available as a possible discriminator. */
    readonly path: readonly string[];
    /** The allowed values of the type at the given `path`. */
    readonly values: readonly LiteralValue[];
    /** In case of a union, this maps all `values` to their appropriate subtype of the union. */
    readonly mapping?: ReadonlyArray<{ type: BaseTypeImpl<unknown>; values: readonly LiteralValue[] }>;
};
