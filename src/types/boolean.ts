import { BaseTypeImpl, createType } from '../base-type';
import type { Result, TypeImpl } from '../interfaces';

export class BooleanType<ResultType extends boolean = boolean> extends BaseTypeImpl<ResultType> {
    readonly name = 'boolean';
    readonly basicType = 'boolean';
    readonly enumerableLiteralDomain = new Set([true, false]);

    typeValidator(value: unknown): Result<ResultType> {
        return this.createResult(
            value,
            typeof value === 'boolean' || { type: this, kind: 'invalid basic type', expected: 'boolean', value },
        );
    }
}

export const boolean: TypeImpl<BooleanType> = createType(new BooleanType());
