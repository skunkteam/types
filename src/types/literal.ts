import { BaseTypeImpl, createType } from '../base-type';
import type { LiteralValue, Result, TypeImpl } from '../interfaces';
import { basicType, printValue } from '../utils';

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
}

export function literal<T extends LiteralValue>(value: T): TypeImpl<LiteralType<T>> {
    return createType(new LiteralType(value));
}

export const nullType: TypeImpl<LiteralType<null>> = literal(null);
export const undefinedType: TypeImpl<LiteralType<undefined>> = literal(undefined);
export const voidType: TypeImpl<LiteralType<void>> = undefinedType;
