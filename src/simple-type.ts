import { BaseTypeImpl, createType } from './base-type';
import type { BasicType, Result, Type, ValidationOptions, ValidationResult } from './interfaces';

/**
 * Implementation for simple types such as primitive types.
 */
export class SimpleType<ResultType> extends BaseTypeImpl<ResultType> {
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
        simpleValidator: (input: unknown, options: ValidationOptions, type: SimpleType<ResultType>) => ValidationResult,
        options?: Pick<BaseTypeImpl<ResultType>, 'enumerableLiteralDomain'> & { autoCaster: BaseTypeImpl<ResultType>['autoCaster'] },
    ): Type<ResultType> {
        const type = new SimpleType(name, basicType, simpleValidator);
        Object.assign(type, options);
        return createType(type);
    }

    private constructor(
        readonly name: string,
        readonly basicType: BasicType | 'mixed',
        private readonly simpleValidator: (input: unknown, options: ValidationOptions, type: SimpleType<ResultType>) => ValidationResult,
    ) {
        super();
    }

    protected typeValidator(input: unknown, options: ValidationOptions): Result<ResultType> {
        return this.createResult(input, input, this.simpleValidator(input, options, this));
    }
}
