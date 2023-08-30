import { NEEDS_ESCAPE, defaultStringify, stringStringify } from './stringifiers.js';

describe(stringStringify, () => {
    test('NEEDS_ESCAPE', () => {
        // Build the regexp from scratch in this test to validate its correctness.

        // First identify all codepoints that need escaping:
        const allCodepoints = Array.from({ length: 2 << 16 }, (_, i) => i);
        const escapedCodepoints = allCodepoints.filter(cp => {
            const s = String.fromCodePoint(cp);
            return JSON.stringify(s) !== `"${s}"`;
        });

        // Now collect those into ranges:
        const ranges = [];
        let current;
        for (const cp of escapedCodepoints) {
            if (current && cp === current.end + 1) {
                // Extend the current range if it is the next codepoint
                current.end = cp;
            } else {
                // Otherwise push a new range
                ranges.push((current = { begin: cp, end: cp }));
            }
        }

        const FRESH_RE = `/[${ranges
            .map(({ begin, end }) =>
                begin === end
                    ? `\\u${begin.toString(16).padStart(4, '0')}`
                    : `\\u${begin.toString(16).padStart(4, '0')}-\\u${end.toString(16).padStart(4, '0')}`,
            )
            .join('')}]/`;

        expect(NEEDS_ESCAPE.toString()).toBe(FRESH_RE);
    });

    test.each(['Needs escaping: \n', 'No need to escape...', '"', '\t', '', '🤪', '𝌆', '\uD834\uDF06', '\uDF06\uD834', '\uDEAD'])(
        'Correctly stringify: %j',
        s => {
            expect(stringStringify(s)).toBe(JSON.stringify(s));
        },
    );
});

describe(defaultStringify, () => {
    test.each`
        type           | value          | expected
        ${'function'}  | ${'whatever'}  | ${undefined}
        ${'symbol'}    | ${'whatever'}  | ${undefined}
        ${'undefined'} | ${'whatever'}  | ${undefined}
        ${'bigint'}    | ${BigInt(123)} | ${new TypeError('Do not know how to serialize a BigInt')}
        ${'boolean'}   | ${true}        | ${'true'}
        ${'boolean'}   | ${false}       | ${'false'}
        ${'null'}      | ${'whatever'}  | ${'null'}
        ${'number'}    | ${'whatever'}  | ${'null'}
        ${'number'}    | ${Infinity}    | ${'null'}
        ${'number'}    | ${12345}       | ${'12345'}
        ${'string'}    | ${'whatever'}  | ${'"whatever"'}
        ${'object'}    | ${'whatever'}  | ${new Error('stringify not supported on type MyTypeName')}
        ${'array'}     | ${'whatever'}  | ${new Error('stringify not supported on type MyTypeName')}
        ${'mixed'}     | ${'whatever'}  | ${new Error('stringify not supported on type MyTypeName')}
    `('$type $value', ({ type, value, expected }) => {
        if (expected instanceof Error) {
            expect(() => defaultStringify(type, value, 'MyTypeName')).toThrow(expected);
        } else {
            expect(defaultStringify(type, value, 'MyTypeName')).toBe(expected);
        }
    });
});
