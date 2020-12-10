import { BaseTypeImpl, createType } from '../base-type';
import type { LiteralValue, Result, TypeImpl } from '../interfaces';
import { autoCastFailure } from '../symbols';
import { basicType, printValue } from '../utils';
import { booleanAutoCaster } from './boolean';
import { numberAutoCaster } from './number';

export class LiteralType<ResultType extends LiteralValue> extends BaseTypeImpl<ResultType> {
    readonly name: string;

    constructor(readonly value: ResultType) {
        super();
        this.name = printValue(value);
    }

    readonly basicType = basicType(this.value);
    readonly enumerableLiteralDomain = new Set([this.value]);

    typeValidator(value: unknown): Result<ResultType> {
        return this.createResult(
            value,
            value === this.value ||
                (basicType(value) !== this.basicType
                    ? { type: this, value, kind: 'invalid basic type', expected: this.basicType, expectedValue: this.value }
                    : { type: this, value, kind: 'invalid literal', expected: this.value }),
        );
    }

    protected autoCaster(input: unknown): LiteralValue | typeof autoCastFailure {
        switch (this.basicType) {
            case 'string':
                return String(input);
            case 'number':
                return numberAutoCaster(input);
            case 'boolean':
                return booleanAutoCaster(input);
            case 'null':
            case 'undefined':
                return input == null ? this.value : autoCastFailure;
            default:
                return autoCastFailure;
        }
    }
}

export function literal<T extends LiteralValue>(value: T): TypeImpl<LiteralType<T>> {
    return createType(new LiteralType(value));
}

export const nullType: TypeImpl<LiteralType<null>> = literal(null);
export const undefinedType: TypeImpl<LiteralType<undefined>> = literal(undefined);
export const voidType: TypeImpl<LiteralType<void>> = undefinedType;
