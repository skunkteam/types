import { BaseTypeImpl, createType } from '../base-type';
import type { Branded, Result, The, Type, TypeImpl } from '../interfaces';
import { autoCastFailure } from '../symbols';

export class NumberType<ResultType extends number = number> extends BaseTypeImpl<ResultType> {
    readonly name = 'number';
    readonly basicType = 'number';

    typeValidator(value: unknown): Result<ResultType> {
        if (typeof value !== 'number') {
            return this.createResult(value, { type: this, kind: 'invalid basic type', expected: 'number', value });
        }
        return this.createResult(value, !Number.isNaN(value));
    }

    protected autoCaster = numberAutoCaster;
}

export const number: TypeImpl<NumberType> = createType(new NumberType());

export type int = The<typeof int>;
export const int: Type<Branded<number, 'int'>> = number.withConstraint('int', Number.isInteger);

export function numberAutoCaster(input: unknown): number | typeof autoCastFailure {
    const nr = typeof input === 'number' ? input : input === '' ? NaN : +String(input);
    return Number.isNaN(nr) ? autoCastFailure : nr;
}
