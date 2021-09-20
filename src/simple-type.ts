import { BaseTypeImpl, createType } from './base-type';
import type { BasicType, Result, Type, ValidationOptions, ValidationResult } from './interfaces';

export interface SimpleTypeOptions<ResultType, TypeConfig> {
    enumerableLiteralDomain?: BaseTypeImpl<ResultType, TypeConfig>['enumerableLiteralDomain'];
    typeConfig: BaseTypeImpl<ResultType, TypeConfig>['typeConfig'];
    autoCaster?: BaseTypeImpl<ResultType, TypeConfig>['autoCaster'];
    combineConfig?: BaseTypeImpl<ResultType, TypeConfig>['combineConfig'];
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

    readonly typeConfig!: TypeConfig;

    private constructor(
        readonly name: string,
        readonly basicType: BasicType | 'mixed',
        private readonly simpleValidator: (
            input: unknown,
            options: ValidationOptions,
            type: SimpleType<ResultType, TypeConfig>,
        ) => ValidationResult,
    ) {
        super();
    }

    protected typeValidator(input: unknown, options: ValidationOptions): Result<ResultType> {
        return this.createResult(input, input, this.simpleValidator(input, options, this));
    }
}
