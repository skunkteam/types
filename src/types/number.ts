import type { Branded, NumberTypeConfig, The, Type } from '../interfaces.js';
import { SimpleType } from '../simple-type.js';
import { autoCastFailure } from '../symbols.js';
import { evalAdditionalChecks } from '../utils/index.js';

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
                // apply update on top of current
                ...current,
                ...update,

                // but rebuild the actual bounds (because minExclusive should override min, etc.)
                min: undefined,
                minExclusive: undefined,
                max: undefined,
                maxExclusive: undefined,
                ...selectBound('max', current, update),
                ...selectBound('min', current, update),
            } as NumberTypeConfig;
        },
        acceptVisitor: (type, visitor) => visitor.visitNumberType(type),
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

const BIG = typeof BigInt === 'function' ? BigInt : (Number as typeof BigInt);
const ZERO = BIG(0);
const TEN = BIG(10);

function isMultiple(value: number, multiple: number) {
    if (!isFinite(value) || !isFinite(multiple)) return false;

    // Using the remainder operation is only safe in the integer space.
    if (Math.abs(value) <= Number.MAX_SAFE_INTEGER && Number.isSafeInteger(multiple)) return value % multiple === 0;

    // It gets tricky for non-integer and especially small divisors. Using remainder does not work for small divisors, e.g.
    // `1 % 0.1 === 0.09999999999999995`. As a workaround, we convert both operands to integers first.
    const valueParts = decomposeFloat(value);
    const multipleParts = decomposeFloat(multiple);

    // Now sync the exponent
    const exponent = Math.min(valueParts.exponent, multipleParts.exponent);
    const valueSignificand = significandForGivenExponent(valueParts, exponent);
    const multipleSignificand = significandForGivenExponent(multipleParts, exponent);
    return valueSignificand % multipleSignificand === ZERO;
}

function decomposeFloat(n: number) {
    const [significand, exponent] = n.toExponential().split('e') as [string, string];
    // Now denormalize the significand to get rid of the decimal point.
    const [base, frac] = significand.split('.') as [string, string | undefined];
    return {
        significand: BIG(base + (frac || '')),
        exponent: +exponent - (frac ? frac.length : 0),
    };
}

function significandForGivenExponent(input: ReturnType<typeof decomposeFloat>, exponent: number) {
    return BIG(input.significand) * TEN ** BIG(input.exponent - exponent);
}

type Bound<T extends 'min' | 'max'> = { [K in T | `${T}Exclusive`]?: number };

/**
 * Check and return the updated bound, falling back to the current bound, taking exclusivity into account.
 *
 * @param key check the upper bound ('max') or the lower bound ('min')
 * @param current the current bounds
 * @param update the update
 * @returns the bound to use
 */
function selectBound<T extends 'min' | 'max'>(key: T, current: Bound<T>, update: Bound<T>): Bound<T> {
    const exclKey = `${key}Exclusive` as const;
    const currentPosition: number | undefined = current[key] ?? current[exclKey];
    if (currentPosition == null) return update;

    const updatedPosition: number | undefined = update[key] ?? update[exclKey];
    if (updatedPosition == null) return current;

    if (
        // if the position of the updated bound is outside the current bound
        (key === 'max' ? currentPosition < updatedPosition : currentPosition > updatedPosition) ||
        // or the position is the same, but the exclusivity is incompatible
        (currentPosition === updatedPosition && current[exclKey] != null && update[exclKey] == null)
    ) {
        const printKey = (b: Bound<T>) => (b[exclKey] == null ? key : exclKey);
        const updateKey = printKey(update);
        const currentKey = printKey(current);
        throw `the new bound (${updateKey}: ${updatedPosition}) is outside the existing bound (${currentKey}: ${currentPosition})`;
    }
    return update;
}
