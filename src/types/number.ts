import type { Branded, The, Type } from '../interfaces';
import { SimpleType } from '../simple-type';
import { autoCastFailure } from '../symbols';

export const number: Type<number> = SimpleType.create(
    'number',
    'number',
    input => (typeof input !== 'number' ? { kind: 'invalid basic type', expected: 'number' } : !Number.isNaN(input)),
    { autoCaster: numberAutoCaster },
);

export type int = The<typeof int>;
export const int: Type<Branded<number, 'int'>> = number.withConstraint('int', Number.isInteger);

export function numberAutoCaster(input: unknown): number | typeof autoCastFailure {
    const nr = typeof input === 'number' ? input : input === '' ? NaN : +String(input);
    return Number.isNaN(nr) ? autoCastFailure : nr;
}
