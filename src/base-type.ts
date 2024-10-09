import type {
    BasicType,
    Branded,
    DeepUnbranded,
    LiteralValue,
    MergeIntersection,
    ObjectType,
    ParserOptions,
    PossibleDiscriminator,
    Properties,
    PropertiesInfo,
    PropertyInfo,
    Result,
    Type,
    TypeImpl,
    TypeLink,
    TypeOf,
    TypeguardFor,
    TypeguardResult,
    ValidationOptions,
    ValidationResult,
    Validator,
    Visitor,
} from './interfaces';
import { autoCastFailure, designType } from './symbols';
import {
    addParserInputToResult,
    an,
    basicType,
    bracketsIfNeeded,
    castArray,
    checkOneOrMore,
    decodeOptionalOptions,
    defaultStringify,
    prependContextToDetails,
    printValue,
} from './utils';
import { ValidationError } from './validation-error';

/**
 * The base-class of all type-implementations.
 *
 * @remarks
 * All type-implementations must extend this base class. Use {@link createType} to create a {@link Type} from a type-implementation.
 */
export abstract class BaseTypeImpl<ResultType, TypeConfig = unknown> implements TypeLink<ResultType> {
    /**
     * The associated TypeScript-type of a Type.
     * @internal
     */
    readonly [designType]!: ResultType;

    /** The name of the Type. */
    abstract readonly name: string;

    /**
     * The kind of values this type validates.
     *
     * @remarks
     * See {@link BasicType} for more info about the rationale behind the basic type.
     */
    abstract readonly basicType: BasicType | 'mixed';

    /**
     * The set of valid literals if enumerable.
     *
     * @remarks
     * If a Type (only) accepts a known number of literal values, these should be enumerated in this set. A record with such a
     * domain as key-type
     */
    readonly enumerableLiteralDomain?: Iterable<LiteralValue>;

    /**
     * Extra information that is made available by this Type for runtime analysis.
     */
    abstract readonly typeConfig: TypeConfig;

    /**
     * The actual validation-logic.
     *
     * @param input - the input value to be validated
     * @param options - the current validation context
     */
    protected abstract typeValidator(input: unknown, options: ValidationOptions): Result<ResultType>;

    /**
     * Additional custom validation added using {@link BaseTypeImpl.withValidation | withValidation} or
     * {@link BaseTypeImpl.withConstraint | withConstraint}.
     *
     * @remarks
     * It says `Validator<unknown>` here, but it should only contain closures with `Validator<ResultType>` parameters. However, that would
     * mean that this type is no longer assignable to `Type<unknown>` which is technically correct, but very inconvenient. We want to be
     * able to write functions that ask for a type that validates anything, we don't care what. If we are not able to use the type
     * `Type<unknown>` in those cases, then we are left with `Type<any>` which leads to `any`-contamination of our consumer code.
     */
    protected readonly customValidators: ReadonlyArray<Validator<unknown>> = [];

    /**
     * Optional pre-processing parser.
     *
     * @param input - the input value to be validated
     * @param options - the current validation context
     */
    protected typeParser?(input: unknown, options: ValidationOptions): Result<unknown>;

    /**
     * Accept a visitor (visitor pattern).
     *
     * @remarks
     * Note that, while it can be used to traverse a tree, this is not part of this pattern. The visitor that visits a particular type can
     * decide to visit children of that type (or not). See `./testutils.ts` for an example.
     *
     * @param visitor - the visitor to accept
     */
    abstract accept<R>(visitor: Visitor<R>): R;

    private readonly _instanceCache: {
        autoCast?: BaseTypeImpl<ResultType, TypeConfig>;
        autoCastAll?: BaseTypeImpl<ResultType, TypeConfig>;
        boundCheck?: BaseTypeImpl<ResultType, TypeConfig>['check'];
        boundIs?: BaseTypeImpl<ResultType, TypeConfig>['is'];
    } = {};

    /**
     * The same type, but with an auto-casting default parser installed.
     *
     * @remarks
     * Each type implementation provides its own auto-cast rules. See builtin types for examples of auto-cast rules.
     */
    get autoCast(): this {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const { autoCaster, typeParser } = this;
        if (!autoCaster || typeParser) return this;
        return (this._instanceCache.autoCast ??= createType(this, {
            name: { configurable: true, value: `${bracketsIfNeeded(this.name)}.autoCast` },
            typeParser: { configurable: true, value: createAutoCastParser(autoCaster) },
        })) as this;
    }

    /**
     * Create a recursive autocasting version of the current type.
     *
     * @remarks
     * This will replace any parser in the nested structure with the appropriate autocaster when applicable.
     */
    get autoCastAll(): this {
        return (this._instanceCache.autoCastAll ??= this.createAutoCastAllType()) as this;
    }

    protected createAutoCastAllType(): this {
        return this.autoCast;
    }

    /**
     * The logic that is used in the autocasting version of the current type.
     *
     * @remarks
     * To be overwritten by subclasses if necessary.
     *
     * @param value - the input value to try to autocast to the appropriate form
     */
    protected autoCaster?(this: BaseTypeImpl<ResultType, TypeConfig>, value: unknown): unknown;

    /**
     * Verifies that a value conforms to this Type.
     *
     * @remarks
     * When given a value that does not conform to the Type, throws an exception.
     *
     * Note that this method can only be used if the type object is explicitly annotated with the type,
     * see: https://github.com/microsoft/TypeScript/issues/34596#issuecomment-548084070
     *
     * Example:
     * ```typescript
     * const MyImplicitType = object('MyImplicitType', { a: string });
     * const MyExplicitType: Type<{ a: string }> = object('MyExplicitType', { a: string });
     *
     * // Does not work :
     * MyImplicitType.assert(value);
     *
     * // Works :-D
     * MyExplicitType.assert(value);
     * ```
     *
     * @param input - the value to assert
     */
    assert(input: unknown): asserts input is ResultType {
        const result = this.validate(input, { mode: 'check' });
        if (!result.ok) throw ValidationError.fromFailure(result);
    }

    /**
     * Asserts that a value conforms to this Type and returns the input as is, if it does.
     *
     * @remarks
     * When given a value that does not conform to the Type, throws an exception.
     *
     * Note that this does not invoke the parser (including the auto-caster). Use {@link BaseTypeImpl.construct}
     *
     * @param input - the value to check
     */
    get check(): (this: void, input: unknown) => ResultType {
        return (this._instanceCache.boundCheck ??= input => {
            this.assert(input);
            return input;
        });
    }

    /**
     * Calls any registered parsers or auto-caster, verifies that the resulting value conforms to this Type and returns it if it does.
     *
     * @remarks
     * When given a value that either cannot be parsed by the optional parser or does not conform to the Type, throws an exception.
     *
     * `SomeType(...)` is shorthand for `SomeType.construct(...)`
     *
     * @param input - the input value to parse and validate
     */
    construct(input: unknown): ResultType {
        const result = this.validate(input);
        if (!result.ok) throw ValidationError.fromFailure(result);
        return result.value;
    }

    /**
     * Calls any registered parsers or auto-caster, verifies that the resulting value conforms to this Type and returns it if it does.
     *
     * @remarks
     * When given a value that either cannot be parsed by the optional parser or does not conform to the Type, throws an exception.
     *
     * This is the same as {@link BaseTypeImpl.construct}, but accepts an argument that has a similar structure to the type itself, so
     * code editors will offer code completion for this literal argument.
     *
     * Example:
     * ```typescript
     * const User = object('User', { id: int });
     * const user = User.literal({
     *     // proper code completion here
     *     id: 1234,
     * })
     * ```
     *
     * @param input - the input value to parse and validate
     */
    literal(input: DeepUnbranded<ResultType>): ResultType {
        return this.construct(input);
    }

    /**
     * Validates that a value conforms to this type, and returns a result indicating
     * success or failure (does not throw).
     *
     * @remarks
     * If the given {@link ValidationOptions.mode} is `'construct'` (default) it also calls the parser to pre-process the given input.
     *
     * @param input - the input value to be validated
     * @param options - the current validation context
     */
    validate(input: unknown, options: ValidationOptions = { mode: 'construct' }): Result<ResultType> {
        // Preventing circular problems is only relevant on object values...
        const valueMap = typeof input === 'object' && input ? getVisitedMap(this, options) : undefined;
        const previousResult = valueMap?.get(input);
        if (previousResult) return previousResult;

        let value = input;
        if (this.typeParser && options.mode === 'construct') {
            const constructorResult = this.typeParser(value, options);
            if (!constructorResult.ok) {
                return { ...constructorResult, details: prependContextToDetails(constructorResult, 'parser') };
            }
            value = constructorResult.value;
        }
        let result = this.typeValidator(value, options);
        for (const customValidator of this.customValidators) {
            if (!result.ok) break;
            const resultValue = result.value;
            const tryResult = ValidationError.try({ type: this, input }, () => customValidator(resultValue, options));
            result = tryResult.ok ? this.createResult(resultValue, resultValue, tryResult.value) : tryResult;
        }
        if (this.typeParser && options.mode === 'construct') {
            result = addParserInputToResult(result, input);
        }
        valueMap?.set(input, result);
        return result;
    }

    /**
     * A type guard for this Type.
     */
    get is(): TypeguardFor<ResultType> {
        this._instanceCache.boundIs ??= <Input>(input: Input): input is TypeguardResult<ResultType, Input> =>
            this.validate(input, { mode: 'check' }).ok;
        return this._instanceCache.boundIs;
    }

    /**
     * Create a new instance of this Type with the given name.
     *
     * @remarks
     * Does not create a brand.
     *
     * @param name - the new name to use in error messages
     */
    withName(name: string): this {
        return createType(this, { name: { configurable: true, value: name } });
    }

    /**
     * Create a new instance of this Type with the given name.
     *
     * @remarks
     * Creates a brand. By creating a branded type, we ensure that TypeScript will consider this a separate type, see {@link Branded} for more information.
     *
     * @param name - the new name to use in error messages
     */
    withBrand<const BrandName extends string>(name: BrandName): Type<Branded<ResultType, BrandName>, TypeConfig> {
        return createType(branded<ResultType, BrandName, TypeConfig>(this), { name: { configurable: true, value: name } });
    }

    /**
     * Create a new instance of this Type with the additional type-specific config, such as min/max values.
     *
     * @remarks
     * Creates a brand. By creating a branded type, we ensure that TypeScript will consider this a separate type, see {@link Branded} for more information.
     *
     * @param name - the name to use in error messages
     * @param newConfig - the new type-specific config that further restricts the accepted values
     */
    withConfig<const BrandName extends string>(name: BrandName, newConfig: TypeConfig): Type<Branded<ResultType, BrandName>, TypeConfig> {
        return createType(branded<ResultType, BrandName, TypeConfig>(this), {
            name: { configurable: true, value: name },
            typeConfig: { configurable: true, value: this.combineConfig(this.typeConfig, newConfig) },
        });
    }

    /**
     * Create a function with validated input.
     *
     * @remarks
     * Note that only the first parameter to the function is checked. The resulting function can be used as a parser and integrates nicely with other types.
     *
     * @param fn - the function with input to be checked
     */
    andThen<Return, RestArgs extends unknown[]>(
        fn: (value: ResultType, ...restArgs: RestArgs) => Return,
    ): (input: unknown, ...restArgs: RestArgs) => Return {
        return (input, ...rest) => {
            const preconditionResult = this.validate(input);
            if (!preconditionResult.ok) {
                throw ValidationError.fromFailure({
                    ...preconditionResult,
                    details: prependContextToDetails(preconditionResult, 'precondition'),
                });
            }
            return fn(preconditionResult.value, ...rest);
        };
    }

    /**
     * Define a new type with the same specs, but with the given parser and an optional new name.
     *
     * @remarks
     * This given parser may throw ValidationErrors to indicate validation failures during parsing.
     */
    withParser(
        ...args:
            | [newConstructor: (i: unknown) => unknown]
            | [name: string, newConstructor: (i: unknown) => unknown]
            | [options: ParserOptions, newConstructor: (i: unknown) => unknown]
    ): this {
        const [{ name, chain }, constructor] = decodeOptionalOptions<ParserOptions, (i: unknown) => unknown>(args);
        const parentParser = chain && this.typeParser?.bind(this);
        const type = createType(this, {
            ...(name && { name: { configurable: true, value: name } }),
            typeParser: {
                configurable: true,
                value: (input: unknown, options: ValidationOptions) => {
                    const result = ValidationError.try({ type, input }, () => constructor(input));
                    if (!result.ok || !parentParser) return result;
                    return addParserInputToResult(parentParser(result.value, options), input);
                },
            },
        });
        return type;
    }

    /**
     * Clone the type with the added validation.
     *
     * @remarks
     * Does not create a brand.
     *
     * @param validation - the additional validation to restrict the current type
     */
    withValidation(validation: Validator<ResultType>): this {
        // default to the message "additional validation failed", this differs from `withConstraint` where we don't fall back to a default
        // message. This results in subtly different error messages. Using `withValidation` the error message will be something like:
        // "[BaseType]: additional validation failed", while `withConstraint` will result in "expected a [NewTypeName], got: ...".
        const validator: Validator<ResultType> = (input, options) => validation(input, options) || 'additional validation failed';
        return createType(this, { customValidators: { configurable: true, value: [...this.customValidators, validator] } });
    }

    /**
     * Create a new type based on the current type and use the given constraint function as validation.
     *
     * @remarks
     * Creates a brand. By creating a branded type, we ensure that TypeScript will consider this a separate type, see {@link Branded} for more information.
     *
     * @param name - the new name to use in error messages
     * @param constraint - the additional validation to restrict the current type
     */
    withConstraint<const BrandName extends string>(
        name: BrandName,
        constraint: Validator<ResultType>,
    ): Type<Branded<ResultType, BrandName>, TypeConfig> {
        return createType(branded<ResultType, BrandName, TypeConfig>(this), {
            name: { configurable: true, value: name },
            customValidators: { configurable: true, value: [...this.customValidators, constraint] },
        });
    }

    /**
     * Extend the Type with additional static methods and properties.
     *
     * @remarks
     * Can be used to provide Type-specific utilities, nicely namespaced.
     *
     * @example
     * ```typescript
     * const ISODate = string.withRegexpConstraint('ISODate', ISODateRE).extendWith(T => ({
     *     fromJS: (date: Date) => ISODate(formatISO(date)),
     *     toJS: (isoDate: The<typeof T>) => parseISO(isoDate),
     * }));
     *
     * const now = ISODate.fromJS(new Date());
     * ```
     */
    extendWith<const E>(factory: (type: this) => E): this & E {
        return createType(this, Object.getOwnPropertyDescriptors(factory(this))) as unknown as this & E;
    }

    /**
     * Union this Type with another Type.
     *
     * @remarks
     * See {@link UnionType} for more information about unions.
     */
    // istanbul ignore next: using ordinary stub instead of module augmentation to lighten the load on the TypeScript compiler
    or<Other extends BaseTypeImpl<unknown>>(_other: Other): Type<ResultType | TypeOf<Other>> {
        throw new Error('stub');
    }

    /**
     * Create a JSON string of the given value, using the type information of the current type. Matches the specs of `JSON.stringify`.
     *
     * @remarks
     * Only use this method on values that have been validated or constructed by this type. It will use the available type information to
     * efficiently create a stringified version of the value. Unknown (extra) properties of object types are stripped.
     *
     * Note that this implementation matches the specs of `JSON.stringify` in that it will throw on a `BigInt` and will return `undefined`
     * for other values that are not serializable into JSON.
     *
     * @param value - a previously validated or constructed value, must conform to this type
     */
    maybeStringify(value: ResultType): string | undefined {
        return defaultStringify(this.basicType, value, this.name);
    }

    /**
     * Create a JSON string of the given value, using the type information of the current type. Throws if the value is not serializable.
     *
     * @remarks
     * Only use this method on values that have been validated or constructed by this type. It will use the available type information to
     * efficiently create a stringified version of the value. Unknown (extra) properties of object types are stripped.
     *
     * Note that this implementation differs from the specs of `JSON.stringify` in that it will throw on all values that are not
     * serializable into JSON.
     *
     * @param value - a previously validated or constructed value, must conform to this type
     */
    stringify(value: ResultType): string {
        const s = this.maybeStringify(value);
        if (s === undefined) {
            // Match the built-in error message of `BigInt`s.
            throw new TypeError(`Do not know how to serialize ${an(basicType(value))}`);
        }
        return s;
    }

    /**
     * Create a Result based on the given {@link ValidationResult}.
     *
     * @param input - the original input to the validator or parser
     * @param result - the resulting value
     * @param validatorResult - the result of the validation or parse step
     */
    protected createResult(input: unknown, result: unknown, validatorResult: ValidationResult): Result<ResultType> {
        if (isOk(validatorResult)) {
            return { ok: true, value: result as ResultType };
        }
        if (validatorResult === false) {
            return { ok: false, input, type: this, details: [{ type: this, input }] };
        }
        return {
            ok: false,
            input,
            type: this,
            details: checkOneOrMore(
                castArray(validatorResult).map(result => ({
                    type: this,
                    input,
                    ...(typeof result === 'string' ? { kind: 'custom message', message: result } : result),
                })),
            ),
        };
    }

    /**
     * Combine two config values into a new value.
     *
     * @remarks
     * Can be overridden by subclasses to check/change new configs when `withConfig` is used.
     *
     * @param oldConfig - the current config of the base type
     * @param newConfig - the new provided config
     * @returns a new config object based on the old and new config
     */
    protected combineConfig(oldConfig: TypeConfig, newConfig: TypeConfig): TypeConfig {
        return { ...oldConfig, ...newConfig };
    }
}
Object.defineProperties(BaseTypeImpl.prototype, {
    ...Object.getOwnPropertyDescriptors(Function.prototype),
    name: { value: BaseTypeImpl.name, configurable: true, writable: true },
});

/**
 * The base implementation for all object-like Types.
 *
 * @remarks
 * Object-like types need to provide more information to be able to correctly
 * compose arbitrary object-like types.
 */
export abstract class BaseObjectLikeTypeImpl<ResultType, TypeConfig = unknown> extends BaseTypeImpl<ResultType, TypeConfig> {
    abstract readonly props: Properties;
    abstract readonly propsInfo: PropertiesInfo;
    abstract readonly possibleDiscriminators: readonly PossibleDiscriminator[];
    abstract readonly isDefaultName: boolean;

    private _propsArray?: ReadonlyArray<[string, PropertyInfo]>;
    /** Array of props tuples (`Object.entries(this.prop)`). */
    protected get propsArray(): ReadonlyArray<[string, PropertyInfo]> {
        return (this._propsArray ??= Object.entries(this.propsInfo));
    }

    /**
     * Intersect this Type with another Type.
     *
     * @remarks
     * See {@link IntersectionType} for more information about intersections.
     */
    // istanbul ignore next: using ordinary stub instead of module augmentation to lighten the load on the TypeScript compiler
    and<Other extends BaseObjectLikeTypeImpl<any, any>>(
        _other: Other,
    ): ObjectType<MergeIntersection<ResultType & Other[typeof designType]>> & TypedPropertyInformation<this['props'] & Other['props']> {
        throw new Error('stub');
    }
}

/**
 * Interface that provides more detailed type-information about the `props` and `propsInfo` properties of the validator.
 */
export interface TypedPropertyInformation<Props extends Properties> {
    readonly props: Props;
    readonly propsInfo: PropertiesInfo<Props>;
}

/**
 * Create a Type from the given type-implementation.
 *
 * @remarks
 * Type-implementations (i.e. subclasses of {@link BaseTypeImpl}) provide all the necessary logic and information regarding validation
 * and parsing, but they do not satisfy the `Type` contract yet. This method takes the `construct` method of the given type-impl and uses
 * that function as the base of the Type. It then retrofits all properties of the given implementation onto that constructor function.
 *
 * @param impl - the type-implementation
 * @param override - override certain settings of the created type
 */
export function createType<Impl extends BaseTypeImpl<any, any>>(
    impl: Impl,
    override?: Partial<Record<keyof BaseTypeImpl<any, any> | 'typeValidator' | 'typeParser' | 'customValidators', PropertyDescriptor>>,
): TypeImpl<Impl> {
    // Replace the complete `impl` onto the `construct` function.
    const type = Object.defineProperties(
        Object.setPrototypeOf((input: unknown) => type.construct(input) as unknown, Object.getPrototypeOf(impl) as object),
        {
            ...Object.getOwnPropertyDescriptors(impl),
            ...override,
            _instanceCache: { configurable: true, value: {} },
        },
    ) as TypeImpl<Impl>;
    return type;
}

function branded<ResultType, BrandName extends string, TypeConfig>(
    type: BaseTypeImpl<ResultType, TypeConfig>,
): BaseTypeImpl<Branded<ResultType, BrandName>, TypeConfig> {
    return type as unknown as BaseTypeImpl<Branded<ResultType, BrandName>, TypeConfig>;
}

function getVisitedMap<ResultType>(me: BaseTypeImpl<ResultType, any>, options: ValidationOptions): Map<unknown, Result<ResultType>> {
    const visited = (options.visited ??= new Map<unknown, Map<unknown, Result<unknown>>>());
    let valueMap = visited.get(me);
    if (!valueMap) {
        valueMap = new Map();
        visited.set(me, valueMap);
    }
    return valueMap as Map<unknown, Result<ResultType>>;
}

function isOk(validatorResult: ValidationResult): validatorResult is true | [] {
    return validatorResult === true || (Array.isArray(validatorResult) && !validatorResult.length);
}

function createAutoCastParser<ResultType, TypeConfig>(
    autoCaster: (this: BaseTypeImpl<ResultType, TypeConfig>, value: unknown) => unknown,
): BaseTypeImpl<ResultType, TypeConfig>['typeParser'] {
    return function (this: BaseTypeImpl<ResultType, TypeConfig>, input) {
        const autoCastResult = autoCaster.call(this, input);
        return this.createResult(
            input,
            autoCastResult,
            autoCastResult !== autoCastFailure || {
                kind: 'custom message',
                message: `could not autocast value: ${printValue(input)}`,
                omitInput: true,
            },
        );
    };
}
