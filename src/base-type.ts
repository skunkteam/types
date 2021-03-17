import type {
    BasicType,
    Branded,
    DeepUnbranded,
    LiteralValue,
    Properties,
    PropertiesInfo,
    Result,
    TypeImpl,
    TypeLink,
    ValidationOptions,
    ValidationResult,
    Validator,
} from './interfaces';
import { autoCastFailure, designType } from './symbols';
import type { IntersectionType } from './types/intersection';
import type { UnionType } from './types/union';
import {
    addParserInputToFailure,
    bracketsIfNeeded,
    castArray,
    checkOneOrMore,
    decodeOptionalName,
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
export abstract class BaseTypeImpl<ResultType> implements TypeLink<ResultType> {
    /**
     * The associated TypeScript-type of a Type.
     * @internal
     */
    readonly [designType]: ResultType;

    /** The name of the Type. */
    abstract readonly name: string;

    /**
     * The kind of values this type validates.
     *
     * @remarks
     * See {@link BasicType} for more info about the rationale behind the basic type.
     */
    abstract readonly basicType: BasicType | 'mixed';

    /** The set of valid literals if enumerable.
     *
     * @remarks
     * If a Type (only) accepts a known number of literal values, these should be enumerated in this set. A record with such a
     * domain as key-type
     */
    readonly enumerableLiteralDomain?: Iterable<LiteralValue>;

    /**
     * The actual validation-logic.
     *
     * @param input - the input value to be validated
     * @param options - the current validation context
     */
    protected abstract typeValidator(input: unknown, options: ValidationOptions): Result<ResultType>;

    /**
     * Optional pre-processing parser.
     *
     * @param input - the input value to be validated
     * @param options - the current validation context
     */
    protected typeParser?(input: unknown, options: ValidationOptions): Result<unknown>;

    private _instanceCache: { autoCast?: BaseTypeImpl<ResultType>; autoCastAll?: BaseTypeImpl<ResultType> } = {};

    /**
     * The same type, but with an auto-casting default parser installed.
     *
     * @remarks
     * Each type implementation provides its own auto-cast rules. See builtin types for examples of auto-cast rules.
     */
    get autoCast(): this {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const { autoCaster, typeParser } = this;
        return (this._instanceCache.autoCast ??=
            !autoCaster || typeParser
                ? this
                : createType(this, {
                      name: { configurable: true, value: `${bracketsIfNeeded(this.name)}.autoCast` },
                      typeParser: {
                          configurable: true,
                          value(this: BaseTypeImpl<ResultType>, input: unknown) {
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
                          },
                      },
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
    protected autoCaster?(this: BaseTypeImpl<ResultType>, value: unknown): unknown;

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
    check(input: unknown): ResultType {
        this.assert(input);
        return input;
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
        if (this.typeParser && options.mode === 'construct' && !result.ok) {
            result = addParserInputToFailure(result, input);
        }
        valueMap?.set(input, result);
        return result;
    }

    /**
     * A type guard for this Type.
     */
    is(input: unknown): input is ResultType {
        return this.validate(input, { mode: 'check' }).ok;
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
    withBrand<BrandName extends string>(name: BrandName): TypeImpl<BaseTypeImpl<Branded<ResultType, BrandName>>> {
        return createType(branded<ResultType, BrandName>(this), { name: { configurable: true, value: name } });
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
    withParser(...args: [name: string, newConstructor: (i: unknown) => unknown] | [newConstructor: (i: unknown) => unknown]): this {
        const [name, constructor] = decodeOptionalName(args);
        const type = createType(this, {
            ...(name && { name: { configurable: true, value: name } }),
            typeParser: {
                configurable: true,
                value: (input: unknown) => ValidationError.try({ type, input }, () => constructor(input)),
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
        // Ignoring Brand here, because that is a typings-only feature.
        const fn: BaseTypeImpl<ResultType>['typeValidator'] = (input, options) => {
            const baseResult = this.typeValidator(input, options);
            if (!baseResult.ok) {
                return type.createResult(input, undefined, prependContextToDetails(baseResult, 'base type'));
            }
            const tryResult = ValidationError.try(
                { type, input },
                // if no name is given, then default to the message "additional validation failed"
                () => validation(baseResult.value, options) || 'additional validation failed',
            );
            return tryResult.ok ? type.createResult(baseResult.value, baseResult.value, tryResult.value) : tryResult;
        };
        const type = createType(this, { typeValidator: { configurable: true, value: fn } });
        return type;
    }

    /**
     * Create a new type use the given constraint function to restrict the current type.
     *
     * @remarks
     * Creates a brand. By creating a branded type, we ensure that TypeScript will consider this a separate type, see {@link Branded} for more information.
     *
     * @param name - the new name to use in error messages
     * @param constraint - the additional validation to restrict the current type
     */
    withConstraint<BrandName extends string>(
        name: BrandName,
        constraint: Validator<ResultType>,
    ): TypeImpl<BaseTypeImpl<Branded<ResultType, BrandName>>> {
        // Ignoring Brand here, because that is a typings-only feature.
        const fn: TypeImpl<BaseTypeImpl<Branded<ResultType, BrandName>>>['typeValidator'] = (input, options) => {
            const baseResult = this.typeValidator(input, options);
            if (!baseResult.ok) {
                return newType.createResult(input, undefined, prependContextToDetails(baseResult, 'base type'));
            }
            const tryResult = ValidationError.try({ type: newType, input }, () => constraint(baseResult.value, options));
            return tryResult.ok ? newType.createResult(baseResult.value, baseResult.value, tryResult.value) : tryResult;
        };
        const newType = createType(branded<ResultType, BrandName>(this), {
            name: { configurable: true, value: name },
            typeValidator: { configurable: true, value: fn },
        });
        return newType;
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
    extendWith<E>(factory: (type: this) => E): this & E {
        return (createType(this, Object.getOwnPropertyDescriptors(factory(this))) as unknown) as this & E;
    }

    /**
     * Union this Type with another Type.
     *
     * @remarks
     * See {@link UnionType} for more information about unions.
     */
    // istanbul ignore next: using ordinary stub instead of module augmentation to lighten the load on the TypeScript compiler
    or<Other extends BaseTypeImpl<unknown>>(_other: Other): TypeImpl<UnionType<[this, Other]>> {
        throw new Error('stub');
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
}

/**
 * The base implementation for all object-like Types.
 *
 * @remarks
 * Object-like types need to provide more information to be able to correctly
 * compose arbitrary object-like types.
 */
export abstract class BaseObjectLikeTypeImpl<ResultType> extends BaseTypeImpl<ResultType> {
    abstract readonly props: Properties;
    abstract readonly propsInfo: PropertiesInfo;
    abstract readonly possibleDiscriminators: Array<{ path: string[]; values: LiteralValue[] }>;
    abstract readonly isDefaultName: boolean;

    /**
     * Intersect this Type with another Type.
     *
     * @remarks
     * See {@link IntersectionType} for more information about intersections.
     */
    // istanbul ignore next: using ordinary stub instead of module augmentation to lighten the load on the TypeScript compiler
    and<Other extends BaseObjectLikeTypeImpl<unknown>>(_other: Other): TypeImpl<IntersectionType<[this, Other]>> {
        throw new Error('stub');
    }
}

const FUNCTION_PROTOTYPE_DESCRIPTORS = Object.getOwnPropertyDescriptors(Function.prototype);

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
export function createType<Impl extends BaseTypeImpl<any>>(
    impl: Impl,
    override?: Partial<Record<keyof BaseTypeImpl<any> | 'typeValidator' | 'typeParser', PropertyDescriptor>>,
): TypeImpl<Impl> {
    // Replace the complete `impl` onto the `construct` function.
    const type = Object.defineProperties(
        Object.setPrototypeOf((input: unknown) => type.construct(input) as unknown, Object.getPrototypeOf(impl)),
        {
            ...FUNCTION_PROTOTYPE_DESCRIPTORS,
            ...Object.getOwnPropertyDescriptors(impl),
            ...override,
            _instanceCache: { configurable: true, value: {} },
        },
    ) as TypeImpl<Impl>;
    return type;
}

function branded<ResultType, BrandName extends string>(type: BaseTypeImpl<ResultType>): BaseTypeImpl<Branded<ResultType, BrandName>> {
    return (type as unknown) as BaseTypeImpl<Branded<ResultType, BrandName>>;
}

function getVisitedMap<ResultType>(me: BaseTypeImpl<ResultType>, options: ValidationOptions): Map<unknown, Result<ResultType>> {
    const visited = (options.visited ??= new Map<unknown, Map<unknown, Result<unknown>>>());
    let valueMap = visited.get(me);
    if (!valueMap) {
        visited.set(me, (valueMap = new Map()));
    }
    return valueMap as Map<unknown, Result<ResultType>>;
}

function isOk(validatorResult: ValidationResult): validatorResult is true | [] {
    return validatorResult === true || (Array.isArray(validatorResult) && !validatorResult.length);
}
