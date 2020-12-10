import { BaseTypeImpl, createType } from '../base-type';
import type { Result, TypeImpl } from '../interfaces';
import { autoCastFailure } from '../symbols';

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

    protected autoCaster = booleanAutoCaster;
}

export const boolean: TypeImpl<BooleanType> = createType(new BooleanType());

export function booleanAutoCaster(input: unknown): boolean | typeof autoCastFailure {
    switch (input) {
        case true:
        case 'true':
        case 1:
            return true;
        case false:
        case 'false':
        case 0:
            return false;
        default:
            return autoCastFailure;
    }
}
