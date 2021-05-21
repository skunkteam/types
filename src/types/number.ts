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
    let nr;
    if (typeof input === 'number') {
        nr = input;
    } else {
        const str = String(input);
        // Make sure we have at least one "meaningful" character in the string (because whitespaces are converted to `0`, thanks a lot
        // JavaScript: https://tc39.es/ecma262/#sec-tonumber-applied-to-the-string-type). All possible numbers always have at least one
        // of a-z or 0-9 in them (e.g. "Infinity", ".5", "3e15"), so we just need to look for one and let the Number conversion handle
        // the rest.
        if (!/\w/.test(str)) {
            return autoCastFailure;
        }
        nr = +str;
    }
    return Number.isNaN(nr) ? autoCastFailure : nr;
}
