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
    Unbranded,
    ValidationOptions,
} from './interfaces';
import { designType } from './symbols';
import { decodeOptionalName, prependContextToDetails } from './utils';
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
     * An optional constructor.
     * @internal
     */
    typeConstructor?(input: unknown, options: ValidationOptions): Result<ResultType>;

    /**
     * Verifies that a value conforms to this Type. When given a value that does
     * not conform to the Type, throws an exception.
     * Note: https://github.com/microsoft/TypeScript/issues/34596#issuecomment-548084070
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
        const baseFailure = { type: this, value: input } as const;
        let value = input;
        if (this.typeConstructor && options.mode === 'construct') {
            const constructorResult = this.typeConstructor(value, options);
            if (!constructorResult.ok) {
                return { ...constructorResult, ...baseFailure, details: prependContextToDetails(constructorResult, 'constructor') };
            }
            value = constructorResult.value;
        }
        // Preventing circular problems is only relevant on object values...
        const valueMap = typeof value === 'object' && value ? getVisitedMap(this, options) : undefined;
        const result = valueMap?.get(value) ?? this.typeValidator(value, options);
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
        return Object.defineProperty(createType(this), 'name', { configurable: true, value: name }) as this;
    }

    /**
     * Create a new instance of this Type with the given name. Creates a brand.
     *
     * @param name the new name to use in (some) error messages
     */
    withBrand<BrandName extends string>(name: BrandName): TypeImpl<BaseTypeImpl<Branded<ResultType, BrandName>>> {
        return Object.defineProperty(createType(this), 'name', { configurable: true, value: name }) as TypeImpl<
            BaseTypeImpl<Branded<ResultType, BrandName>>
        >;
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
     * @param constructor the custom constructor logic
     */
    withConstructor<Result extends Unbranded<ResultType>>(
        ...args: [name: string, newConstructor: Constructor<Result>] | [newConstructor: Constructor<Result>]
    ): this {
        const [name, constructor] = decodeOptionalName(args);
        const fn: BaseTypeImpl<ResultType>['typeConstructor'] = input =>
            ValidationError.try({ type: newType, value: input }, () => constructor(input));
        const newType = Object.defineProperties(createType(this), {
            ...(name && { name: { configurable: true, value: name } }),
            typeConstructor: { configurable: true, value: fn },
        }) as this;
        return newType;
    }

    /**
     * Add an arbitrary validation to the type. Does not create a brand.
     */
    withValidation(validation: ConstraintFn<ResultType>): this {
        // Ignoring Brand here, because that is a typings-only feature.
        const fn: this['typeValidator'] = (input, options) => {
            const baseResult = this.typeValidator(input, options);
            if (!baseResult.ok) {
                return newType.createResult(input, prependContextToDetails(baseResult, 'base type'));
            }
            const { value } = baseResult;
            const constraintBox = ValidationError.try({ type: newType, value: input }, () => validation(value, options));
            if (!constraintBox.ok) {
                // constraint has thrown an error
                return constraintBox;
            }
            const constraintResult = constraintBox.value;
            // if no name is given, then default to the message "additional validation failed"
            return newType.createResult(isOk(constraintResult) ? value : input, constraintResult || 'additional validation failed');
        };
        const newType = Object.defineProperties(createType(this), {
            typeValidator: { configurable: true, value: fn },
        }) as this;
        return newType;
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
        const newType = Object.defineProperties(createType(this), {
            ...(name && { name: { configurable: true, value: name } }),
            typeValidator: { configurable: true, value: fn },
        }) as TypeImpl<BaseTypeImpl<Branded<ResultType, BrandName>>>;
        return newType;
    }

    extendWith<E>(factory: (type: this) => E): this & E {
        return Object.defineProperties(createType(this), Object.getOwnPropertyDescriptors(factory(this))) as this & E;
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
        const resultArray = Array.isArray(validatorResult) ? validatorResult : [validatorResult];
        return {
            ok: false,
            value,
            type: this,
            details: resultArray.map(result =>
                typeof result === 'string' ? { type: this, value, kind: 'custom message', message: result } : result,
            ),
        };
    }
}

export abstract class BaseObjectLikeTypeImpl<ResultType> extends BaseTypeImpl<ResultType> {
    abstract readonly props: Properties;
    abstract readonly propsInfo: PropertiesInfo;
    abstract readonly possibleDiscriminators: Array<{ path: string[]; values: LiteralValue[] }>;
    abstract readonly isDefaultName: boolean;
}

export function createType<Impl extends BaseTypeImpl<any>>(impl: Impl): TypeImpl<Impl> {
    // Replace the complete `impl` onto the `construct` function.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const construct: Constructor<TypeOf<Impl>> = input => type.construct(input);
    const type = Object.defineProperties(
        Object.setPrototypeOf(construct, Object.getPrototypeOf(impl)),
        Object.getOwnPropertyDescriptors(impl),
    ) as TypeImpl<Impl>;
    return type;
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
