import type { Branded, NumberTypeConfig, The, Type } from '../interfaces';
import { SimpleType } from '../simple-type';
import { autoCastFailure } from '../symbols';
import { evalAdditionalChecks } from '../utils';

const CONFIG_MUTUALLY_EXCLUSIVE: readonly ReadonlyArray<keyof NumberTypeConfig>[] = [
    ['maxExclusive', 'max'],
    ['minExclusive', 'min'],
];

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
                multipleOf: multipleOf == null || Number.isInteger(input / multipleOf),
            },
            customMessage,
            input,
            violation => ({ kind: 'input out of range', violation, config: type.typeConfig }),
        );
    },
    {
        autoCaster: numberAutoCaster,
        typeConfig: {},
        combineConfig: ({ ...clonedConfig }, newConfig) => {
            for (const exclusives of CONFIG_MUTUALLY_EXCLUSIVE) {
                if (exclusives.some(key => newConfig[key] != null)) {
                    for (const key of exclusives) {
                        if (clonedConfig[key] != null) delete clonedConfig[key];
                    }
                }
            }
            return Object.assign(clonedConfig, newConfig);
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
