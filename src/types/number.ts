import type { Branded, NumberTypeConfig, The, Type } from '../interfaces';
import { SimpleType } from '../simple-type';
import { autoCastFailure } from '../symbols';
import { evalAdditionalChecks } from '../utils';

export const number: Type<number, NumberTypeConfig> = SimpleType.create<number, NumberTypeConfig>(
    'number',
    'number',
    (input, _, type) => {
        if (typeof input !== 'number') return { kind: 'invalid basic type', expected: 'number' };
        if (Number.isNaN(input)) return false;
        const { customMessage, maxExclusive, max, minExclusive, min, multipleOf } = type.typeConfig;
        return evalAdditionalChecks(
            {
                max: (maxExclusive == null || input < maxExclusive) && (max == null || input <= max),
                min: (minExclusive == null || input > minExclusive) && (min == null || input >= min),
                multipleOf: multipleOf == null || isMultiple(input, multipleOf),
            },
            customMessage,
            input,
            violation => ({ kind: 'input out of range', violation, config: type.typeConfig }),
        );
    },
    {
        autoCaster: numberAutoCaster,
        typeConfig: {},
        combineConfig: (current, update) => {
            if (update.multipleOf != null && current.multipleOf != null && !isMultiple(update.multipleOf, current.multipleOf)) {
                throw new Error(
                    `new value of multipleOf (${update.multipleOf}) not compatible with base multipleOf (${current.multipleOf})`,
                );
            }
            return {
                ...current,
                ...update,
                ...selectBound('max', current, update),
                ...selectBound('min', current, update),
            } as NumberTypeConfig;
        },
    },
);

export type int = The<typeof int>;
export const int: Type<Branded<number, 'int'>, NumberTypeConfig> = number.withConfig('int', { multipleOf: 1 });

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

function isMultiple(value: number, multiple: number) {
    // This seems to be the best we can do without introducing big.js. It works for all "sensible cases". Note that this limits the range
    // of `value` to `Math.min(Number.MAX_VALUE, Number.MAX_VALUE * multiple)`. Using modulus does not work for small values, e.g.
    // `1 % 0.1 === 0.09999999999999995`, while `1 / 0.1 === 10`
    return Number.isInteger(value / multiple);
}

type Bound<T extends 'min' | 'max'> = { [K in T | `${T}Exclusive`]?: number };

/**
 * Kind of like `Math.min` and `Math.max`, but taking exclusivity into account. Used to calculate the new upper and lower bounds of
 * restricted number ranges.
 *
 * @param key calculate the upper bound ('max') or the lower bound ('min')
 * @param a one of the input bounds
 * @param b the other one
 * @returns a combined bound
 */
function selectBound<T extends 'min' | 'max'>(key: T, a: Bound<T>, b: Bound<T>): Bound<T> {
    const exclKey = `${key}Exclusive` as const;
    const posA = a[key] ?? a[exclKey];
    const posB = b[key] ?? b[exclKey];
    const exclA = a[exclKey] != null;
    const exclB = b[exclKey] != null;
    let pos, excl;
    if (posA == null) {
        // There is no A.
        pos = posB;
        excl = exclB;
    } else if (posB == null || (key === 'max' ? posA < posB : posA > posB)) {
        // There is no B or the position of B is wrong regardless of exclusivity.
        pos = posA;
        excl = exclA;
    } else {
        // B's position is right,...
        pos = posB;
        // ... but we still have to figure out the exclusivity.
        excl = posA === posB ? exclA || exclB : exclB;
    }
    const result: Bound<T> = {};
    result[key] = excl ? undefined : pos;
    result[exclKey] = excl ? pos : undefined;
    return result;
}
