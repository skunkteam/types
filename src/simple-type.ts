import { BaseTypeImpl, createType } from './base-type';
import type { BasicType, Result, Type, ValidationOptions, ValidationResult, Visitor } from './interfaces';

type SimpleAcceptVisitor<ResultType, TypeConfig> = <R>(type: SimpleType<ResultType, TypeConfig>, visitor: Visitor<R>) => R;

export interface SimpleTypeOptions<ResultType, TypeConfig> {
    enumerableLiteralDomain?: BaseTypeImpl<ResultType, TypeConfig>['enumerableLiteralDomain'];
    typeConfig: BaseTypeImpl<ResultType, TypeConfig>['typeConfig'];
    autoCaster?: BaseTypeImpl<ResultType, TypeConfig>['autoCaster'];
    combineConfig?: BaseTypeImpl<ResultType, TypeConfig>['combineConfig'];
    acceptVisitor?: SimpleAcceptVisitor<ResultType, TypeConfig>;
    maybeStringify?: (value: ResultType) => string | undefined;
}

/**
 * Implementation for simple types such as primitive types.
 */
export class SimpleType<ResultType, TypeConfig> extends BaseTypeImpl<ResultType, TypeConfig> {
    /**
     * Create a simple (limited) type implementation with type config.
     *
     * @param name - the name for the Type
     * @param basicType - the fixed basic type of the Type
     * @param simpleValidator - validation logic
     * @param options - some optional features of BaseTypeImpl
     */
    static create<ResultType, TypeConfig>(
        name: string,
        basicType: BasicType | 'mixed',
        simpleValidator: (input: unknown, options: ValidationOptions, type: SimpleType<ResultType, TypeConfig>) => ValidationResult,
        options: SimpleTypeOptions<ResultType, TypeConfig>,
    ): Type<ResultType, TypeConfig>;

    /**
     * Create a simple (limited) type implementation.
     *
     * @param name - the name for the Type
     * @param basicType - the fixed basic type of the Type
     * @param simpleValidator - validation logic
     * @param options - some optional features of BaseTypeImpl
     */
    static create<ResultType>(
        name: string,
        basicType: BasicType | 'mixed',
        simpleValidator: (input: unknown, options: ValidationOptions, type: SimpleType<ResultType, undefined>) => ValidationResult,
        options?: Omit<SimpleTypeOptions<ResultType, undefined>, 'typeConfig'>,
    ): Type<ResultType, undefined>;

    static create<ResultType>(
        name: string,
        basicType: BasicType | 'mixed',
        simpleValidator: (input: unknown, options: ValidationOptions, type: SimpleType<ResultType, any>) => ValidationResult,
        options: SimpleTypeOptions<ResultType, any> = { typeConfig: undefined },
    ): Type<ResultType, any> {
        const type = new SimpleType<ResultType, any>(name, basicType, simpleValidator);
        Object.assign(type, options);
        return createType(type);
    }

    /** {@inheritdoc BaseTypeImpl.typeConfig} */
    readonly typeConfig!: TypeConfig;
    private readonly acceptVisitor?: SimpleAcceptVisitor<ResultType, TypeConfig>;

    private constructor(
        /** {@inheritdoc BaseTypeImpl.name} */
        readonly name: string,
        /** {@inheritdoc BaseTypeImpl.basicType} */
        readonly basicType: BasicType | 'mixed',
        private readonly simpleValidator: (
            input: unknown,
            options: ValidationOptions,
            type: SimpleType<ResultType, TypeConfig>,
        ) => ValidationResult,
    ) {
        super();
    }

    /** {@inheritdoc BaseTypeImpl.typeValidator} */
    protected typeValidator(input: unknown, options: ValidationOptions): Result<ResultType> {
        return this.createResult(input, input, this.simpleValidator(input, options, this));
    }

    /** {@inheritdoc BaseTypeImpl.accept} */
    accept<R>(visitor: Visitor<R>): R {
        return this.acceptVisitor ? this.acceptVisitor(this, visitor) : visitor.visitCustomType(this);
    }
}
