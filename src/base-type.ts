import type {
    BasicType,
    Branded,
    ConstraintFn,
    Constructor,
    Failure,
    FailureDetails,
    LiteralValue,
    Properties,
    PropertiesInfo,
    Result,
    Success,
    TypeImpl,
    TypeLink,
    TypeOf,
    ValidationOptions,
} from './interfaces';
import { autoCastFailure, designType } from './symbols';
import {
    addParserInputToDetails,
    bracketsIfNeeded,
    cachedInstance,
    castArray,
    decodeOptionalName,
    isFailure,
    prependContextToDetails,
    printValue,
} from './utils';
import { ValidationError } from './validation-error';

/**
 * Static utilities that are available on all type-checkers to allow building new types and provide access to the TypeScript types for
 * design-time type checking.
 * @template ResultType the return-value of the checker
 */
export abstract class BaseTypeImpl<ResultType> implements TypeLink<ResultType> {
    /**
     * The associated TypeScript-type of a Type.
     */
    readonly [designType]: ResultType;

    /** The name of the Type. */
    abstract readonly name: string;

    /** The basic category this type falls in. */
    abstract readonly basicType: BasicType | 'mixed';

    /** The set of valid literals if enumerable. */
    readonly enumerableLiteralDomain?: Set<LiteralValue>;

    /**
     * The validator.
     * @internal
     */
    abstract typeValidator(input: unknown, options: ValidationOptions): Result<ResultType>;

    /**
     * An optional pre-processing parser.
     * @internal
     */
    typeParser?(input: unknown, options: ValidationOptions): Result<unknown>;

    /**
     * Returns the same type with a default parser installed.
     */
    get autoCast(): this {
        return cachedInstance(this, 'autoCast', () => this.createAutoCastType());
    }

    protected createAutoCastType(): this {
        const autoCastParser = (value: unknown) => {
            const result = this.autoCaster(value);
            return result === autoCastFailure
                ? this.createResult(value, `could not autocast value: ${printValue(value)}`)
                : this.createResult(result, true);
        };
        const type: this = createType(this, {
            name: { configurable: true, value: `${bracketsIfNeeded(this.name)}.autoCast` },
            typeParser: { configurable: true, value: autoCastParser },
            autoCast: { configurable: true, get: () => type },
        });
        return type;
    }

    protected autoCaster(value: unknown): unknown {
        return value;
    }

    /**
     *
     * @param input
     */

    /**
     * Verifies that a value conforms to this Type. When given a value that does
     * not conform to the Type, throws an exception.
     *
     * Note that this method can only be used if the type object is explicitly annotated with the type,
     * see: https://github.com/microsoft/TypeScript/issues/34596#issuecomment-548084070
     *
     * Example:
     * ```typescript
     * // This does not work
     * const MyType = type('MyType')
     * ```
     */
    assert(input: unknown): asserts input is ResultType {
        const result = this.validate(input, { mode: 'check' });
        if (!result.ok) throw ValidationError.fromFailure(result);
    }

    /**
     * Verifies that a value conforms to this Type and returns the value if it does. When given a value that does
     * not conform to the Type, throws an exception.
     */
    check(input: unknown): ResultType {
        this.assert(input);
        return input;
    }

    construct(input: unknown): ResultType {
        const result = this.validate(input, { mode: 'construct' });
        if (!result.ok) throw ValidationError.fromFailure(result);
        return result.value;
    }

    /**
     * Validates that a value conforms to this type, and returns a result indicating
     * success or failure (does not throw).
     */
    validate(input: unknown, options: ValidationOptions): Result<ResultType> {
        // Preventing circular problems is only relevant on object values...
        const valueMap = typeof input === 'object' && input ? getVisitedMap(this, options) : undefined;
        const previousResult = valueMap?.get(input);
        if (previousResult) return previousResult;

        const baseFailure = { type: this, value: input } as const;
        let value = input;
        if (this.typeParser && options.mode === 'construct') {
            const constructorResult = this.typeParser(value, options);
            if (!constructorResult.ok) {
                return { ...constructorResult, ...baseFailure, details: prependContextToDetails(constructorResult, 'parser') };
            }
            value = constructorResult.value;
        }
        let result = this.typeValidator(value, options);
        if (this.typeParser && options.mode === 'construct' && isFailure(result)) {
            result = { ...result, details: addParserInputToDetails(result, input) };
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
     * Create a new instance of this Type with the given name. Does not create a brand.
     *
     * @param name the new name to use in (some) error messages
     */
    withName(name: string): this {
        return createType(this, { name: { configurable: true, value: name } });
    }

    /**
     * Create a new instance of this Type with the given name. Creates a brand.
     *
     * @param name the new name to use in (some) error messages
     */
    withBrand<BrandName extends string>(name: BrandName): TypeImpl<BaseTypeImpl<Branded<ResultType, BrandName>>> {
        return createType(branded<ResultType, BrandName>(this), { name: { configurable: true, value: name } });
    }

    /**
     * Create a function with checked input, can be used as constructor and will throw meaningful messages.
     *
     * @param fn the function with checked input
     */
    andThen<Return, RestArgs extends unknown[]>(
        fn: (value: ResultType, ...restArgs: RestArgs) => Return,
    ): (input: unknown, ...restArgs: RestArgs) => Return {
        return (input, ...rest) => {
            const preconditionResult = this.validate(input, { mode: 'construct' });
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
     * Define a new type with the same specs, but with custom constructor logic. This logic can throw ValidationErrors to indicate validation
     * failures.
     * @param name an optional name
     * @param newConstructor the custom constructor logic
     */
    withParser(...args: [name: string, newConstructor: (i: unknown) => unknown] | [newConstructor: (i: unknown) => unknown]): this {
        const [name, constructor] = decodeOptionalName(args);
        const type = createType(this, {
            ...(name && { name: { configurable: true, value: name } }),
            typeParser: {
                configurable: true,
                value: (value: unknown) => ValidationError.try({ type, value }, () => constructor(value)),
            },
        });
        return type;
    }

    /**
     * Add an arbitrary validation to the type. Does not create a brand.
     */
    withValidation(validation: ConstraintFn<ResultType>): this {
        // Ignoring Brand here, because that is a typings-only feature.
        const fn: this['typeValidator'] = (input, options) => {
            const baseResult = this.typeValidator(input, options);
            if (!baseResult.ok) {
                return type.createResult(input, prependContextToDetails(baseResult, 'base type'));
            }
            const { value } = baseResult;
            const constraintBox = ValidationError.try({ type, value: input }, () => validation(value, options));
            if (!constraintBox.ok) {
                // constraint has thrown an error
                return constraintBox;
            }
            const constraintResult = constraintBox.value;
            // if no name is given, then default to the message "additional validation failed"
            return type.createResult(isOk(constraintResult) ? value : input, constraintResult || 'additional validation failed');
        };
        const type = createType(this, { typeValidator: { configurable: true, value: fn } });
        return type;
    }

    /**
     * Use an arbitrary constraint function to create a subtype, restricting the current type.
     */
    withConstraint<BrandName extends string>(
        name: BrandName,
        constraint: ConstraintFn<ResultType>,
    ): TypeImpl<BaseTypeImpl<Branded<ResultType, BrandName>>> {
        // Ignoring Brand here, because that is a typings-only feature.
        const fn: TypeImpl<BaseTypeImpl<Branded<ResultType, BrandName>>>['typeValidator'] = (input, options) => {
            const baseResult = this.typeValidator(input, options);
            if (!baseResult.ok) {
                return newType.createResult(input, prependContextToDetails(baseResult, 'base type'));
            }
            const { value } = baseResult;
            const constraintBox = ValidationError.try({ type: newType, value: input }, () => constraint(value, options));
            if (!constraintBox.ok) {
                // constraint has thrown an error
                return constraintBox;
            }
            const constraintResult = constraintBox.value;
            // if no name is given, then default to the message "additional validation failed"
            return newType.createResult(isOk(constraintResult) ? value : input, constraintResult);
        };
        const newType = createType(branded<ResultType, BrandName>(this), {
            name: { configurable: true, value: name },
            typeValidator: { configurable: true, value: fn },
        });
        return newType;
    }

    extendWith<E>(factory: (type: this) => E): this & E {
        return (createType(this, Object.getOwnPropertyDescriptors(factory(this))) as unknown) as this & E;
    }

    createResult(value: unknown, validatorResult: true): Success<ResultType>;
    createResult(value: unknown, validatorResult: false | string | string[] | FailureDetails | FailureDetails[]): Failure;
    createResult(value: unknown, validatorResult: boolean | string | string[] | FailureDetails | FailureDetails[]): Result<ResultType>;
    createResult(value: unknown, validatorResult: boolean | string | string[] | FailureDetails | FailureDetails[]): Result<ResultType> {
        if (isOk(validatorResult)) {
            return { ok: true, value: value as ResultType };
        }
        if (validatorResult === false) {
            return this.createResult(value, { type: this, value });
        }
        return {
            ok: false,
            value,
            type: this,
            details: castArray(validatorResult).map(result =>
                typeof result === 'string' ? { type: this, value, kind: 'custom message', message: result } : result,
            ),
        };
    }

    /**
     * Union this Type with another.
     */
    or<Other extends BaseTypeImpl<unknown>>(_other: Other): TypeImpl<import('./types').UnionType<[this, Other]>> {
        throw new Error('stub');
    }
}

export abstract class BaseObjectLikeTypeImpl<ResultType> extends BaseTypeImpl<ResultType> {
    abstract readonly props: Properties;
    abstract readonly propsInfo: PropertiesInfo;
    abstract readonly possibleDiscriminators: Array<{ path: string[]; values: LiteralValue[] }>;
    abstract readonly isDefaultName: boolean;

    /**
     * Intersect this Type with another.
     */
    and<Other extends BaseObjectLikeTypeImpl<unknown>>(_other: Other): TypeImpl<import('./types').IntersectionType<[this, Other]>> {
        throw new Error('stub');
    }
}

export function createType<Impl extends BaseTypeImpl<any>>(
    impl: Impl,
    override?: Partial<Record<keyof BaseTypeImpl<any>, PropertyDescriptor>>,
): TypeImpl<Impl> {
    // Replace the complete `impl` onto the `construct` function.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const construct: Constructor<TypeOf<Impl>> = input => type.construct(input);
    const type = Object.defineProperties(Object.setPrototypeOf(construct, Object.getPrototypeOf(impl)), {
        ...Object.getOwnPropertyDescriptors(impl),
        ...override,
    }) as TypeImpl<Impl>;
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

function isOk(validatorResult: boolean | string | string[] | FailureDetails | FailureDetails[]): validatorResult is true | [] {
    return validatorResult === true || (Array.isArray(validatorResult) && !validatorResult.length);
}
