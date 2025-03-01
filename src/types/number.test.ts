import { autoCast, autoCastAll } from '../autocast';
import { basicTypeMessage, defaultMessage, defaultUsualSuspects, testTypeImpl } from '../testutils';
import { humanList } from '../utils/print-utils';
import { int, number } from './number';

testTypeImpl({
    name: 'number',
    type: number,
    basicType: 'number',
    validValues: [0, -Infinity, Infinity, -10.5, 10, 10.123],
    invalidValues: [
        ['123', basicTypeMessage(number, '123')],
        [NaN, defaultMessage(number, NaN)],
        ['', basicTypeMessage(number, '')],
        [' ', basicTypeMessage(number, ' ')],
        ['_', basicTypeMessage(number, '_')],
        ['\n\r\v\t\f', basicTypeMessage(number, '\n\r\v\t\f')],
        ...defaultUsualSuspects(number),
    ],
});

testTypeImpl({
    name: 'int',
    type: int,
    validValues: [0, -0, -10, 10, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.MAX_VALUE],
    invalidValues: [
        [NaN, defaultMessage(int, NaN)],
        ['a string', basicTypeMessage(int, 'a string')],
        ['', basicTypeMessage(int, '')],
        [' ', basicTypeMessage(int, ' ')],
        [-10.5, 'error in [int]: expected a whole number, got: -10.5'],
        [10.123, 'error in [int]: expected a whole number, got: 10.123'],
        [-Infinity, 'error in [int]: expected a whole number, got: -Infinity'],
        [Infinity, 'error in [int]: expected a whole number, got: Infinity'],
        ...defaultUsualSuspects(int),
    ],
});

testTypeImpl({
    name: 'AutoCast<number>',
    type: autoCast(number),
    invalidValues: [
        ['abc', basicTypeMessage(autoCast(number), 'abc')],
        ['123', basicTypeMessage(autoCast(number), '123')],
        [NaN, defaultMessage(autoCast(number), NaN)],
        ['', basicTypeMessage(autoCast(number), '')],
        [' ', basicTypeMessage(autoCast(number), ' ')],
    ],
    validConversions: [
        [123, 123],
        ['123', 123],
        ['-123.456', -123.456],
    ],
    invalidConversions: [
        ['', 'error in parser of [AutoCast<number>]: could not autocast value: ""'],
        [' ', 'error in parser of [AutoCast<number>]: could not autocast value: " "'],
        ['\n\r\v\t\f', 'error in parser of [AutoCast<number>]: could not autocast value: "\\n\\r\\u000b\\t\\f"'],
        [{ toString: () => ' ' }, 'error in parser of [AutoCast<number>]: could not autocast value: " "'],
        ['_', 'error in parser of [AutoCast<number>]: could not autocast value: "_"'],
        ['abc', 'error in parser of [AutoCast<number>]: could not autocast value: "abc"'],
        [NaN, 'error in parser of [AutoCast<number>]: could not autocast value: NaN'],
    ],
});

testTypeImpl({
    name: 'NonNegativeInt',
    type: autoCast(int).withConstraint('NonNegativeInt', n => n >= 0),
    validValues: [0, 1, 10_000],
    invalidValues: [
        ['4', 'error in [NonNegativeInt]: expected a number, got a string ("4")'],
        [-1, 'expected a [NonNegativeInt], got: -1'],
        [1.5, 'error in [NonNegativeInt]: expected a whole number, got: 1.5'],
        [-1.5, 'error in [NonNegativeInt]: expected a whole number, got: -1.5'],
    ],
    validConversions: [
        ['0', 0],
        ['100', 100],
    ],
    invalidConversions: [
        ['-1', 'expected a [NonNegativeInt], got: -1, parsed from: "-1"'],
        ['1.5', 'error in [NonNegativeInt]: expected a whole number, got: 1.5, parsed from: "1.5"'],
        ['aa', 'error in parser of [NonNegativeInt]: could not autocast value: "aa"'],
    ],
});

testTypeImpl({
    name: 'NonNegativeInt',
    type: autoCast(int).withConfig('NonNegativeInt', { min: 0 }),
    validValues: [0, 1, 10_000],
    invalidValues: [
        ['4', 'error in [NonNegativeInt]: expected a number, got a string ("4")'],
        [-1, 'error in [NonNegativeInt]: expected a non-negative number, got: -1'],
        [1.5, 'error in [NonNegativeInt]: expected a whole number, got: 1.5'],
        [
            -1.5,
            ['errors in [NonNegativeInt]:', '', '- expected a non-negative number, got: -1.5', '', '- expected a whole number, got: -1.5'],
        ],
    ],
    validConversions: [
        ['0', 0],
        ['100', 100],
    ],
    invalidConversions: [
        ['-1', 'error in [NonNegativeInt]: expected a non-negative number, got: -1, parsed from: "-1"'],
        ['1.5', 'error in [NonNegativeInt]: expected a whole number, got: 1.5, parsed from: "1.5"'],
        ['aa', 'error in parser of [NonNegativeInt]: could not autocast value: "aa"'],
    ],
});

testTypeImpl({
    name: 'NegativeInt',
    type: int.withConfig('NegativeInt', { maxExclusive: 0 }),
    validValues: [-1, -10_000],
    invalidValues: [
        ['-4', 'error in [NegativeInt]: expected a number, got a string ("-4")'],
        [0, 'error in [NegativeInt]: expected a negative number, got: 0'],
        [-1.5, 'error in [NegativeInt]: expected a whole number, got: -1.5'],
        [
            1.5,
            ['errors in [NegativeInt]:', '', '- expected a negative number, got: 1.5', '', '- expected a whole number, got: 1.5'],
            [{ message: 'expected a negative number, got: 1.5' }, { message: 'expected a whole number, got: 1.5' }],
        ],
    ],
});

const SimpleDecade = number.withConfig('SimpleDecade', { min: 0, maxExclusive: 100, multipleOf: 10 });

testTypeImpl({
    name: 'SimpleDecade',
    type: SimpleDecade,
    validValues: [0, 10, 50, 90],
    invalidValues: [
        [1, 'error in [SimpleDecade]: expected a multiple of 10, got: 1'],
        [
            -1,
            ['errors in [SimpleDecade]:', '', '- expected a non-negative number, got: -1', '', '- expected a multiple of 10, got: -1'],
            [{ message: 'expected a non-negative number, got: -1' }, { message: 'expected a multiple of 10, got: -1' }],
        ],
        [100, 'error in [SimpleDecade]: expected a number less than 100, got: 100'],
        [
            101,
            ['errors in [SimpleDecade]:', '', '- expected a number less than 100, got: 101', '', '- expected a multiple of 10, got: 101'],
            [{ message: 'expected a number less than 100, got: 101' }, { message: 'expected a multiple of 10, got: 101' }],
        ],
    ],
});

testTypeImpl({
    name: 'SimpleDecade',
    type: SimpleDecade.withConfig('SimpleDecade', { customMessage: { multipleOf: '', min: '', max: () => '' } }),
    validValues: [0, 10, 50, 90],
    invalidValues: [
        [1, 'error in [SimpleDecade]: expected a multiple of 10, got: 1'],
        [
            -1,
            ['errors in [SimpleDecade]:', '', '- expected a non-negative number, got: -1', '', '- expected a multiple of 10, got: -1'],
            [{ message: 'expected a non-negative number, got: -1' }, { message: 'expected a multiple of 10, got: -1' }],
        ],
        [100, 'error in [SimpleDecade]: expected a number less than 100, got: 100'],
        [
            101,
            ['errors in [SimpleDecade]:', '', '- expected a number less than 100, got: 101', '', '- expected a multiple of 10, got: 101'],
            [{ message: 'expected a number less than 100, got: 101' }, { message: 'expected a multiple of 10, got: 101' }],
        ],
    ],
});

const Decade = number.withConfig('Decade', {
    min: 0,
    maxExclusive: 100,
    multipleOf: 10,
    customMessage: (got, _input, violations) =>
        `${got} is obviously not a decade, because it is ${humanList(violations.sort(), 'and', v =>
            v === 'min' ? 'negative' : v === 'max' ? 'too large' : 'not a multiple of 10',
        )}`,
});

testTypeImpl({
    name: 'Decade',
    type: Decade,
    validValues: [0, 10, 50, 90],
    invalidValues: [
        [1, 'error in [Decade]: 1 is obviously not a decade, because it is not a multiple of 10'],
        [-1, 'error in [Decade]: -1 is obviously not a decade, because it is negative and not a multiple of 10'],
        [100, 'error in [Decade]: 100 is obviously not a decade, because it is too large'],
        [101, 'error in [Decade]: 101 is obviously not a decade, because it is too large and not a multiple of 10'],
    ],
});

testTypeImpl({
    name: 'AutoCast<Decade>',
    type: autoCast(Decade),
    validValues: [0, 10, 50, 90],
    invalidValues: [
        [1, 'error in [AutoCast<Decade>]: 1 is obviously not a decade, because it is not a multiple of 10'],
        [-1, 'error in [AutoCast<Decade>]: -1 is obviously not a decade, because it is negative and not a multiple of 10'],
        [100, 'error in [AutoCast<Decade>]: 100 is obviously not a decade, because it is too large'],
        [101, 'error in [AutoCast<Decade>]: 101 is obviously not a decade, because it is too large and not a multiple of 10'],
    ],
    validConversions: [
        ['0', 0],
        ['90', 90],
    ],
    invalidConversions: [
        ['1', 'error in [AutoCast<Decade>]: 1 is obviously not a decade, because it is not a multiple of 10'],
        ['-1', 'error in [AutoCast<Decade>]: -1 is obviously not a decade, because it is negative and not a multiple of 10'],
        ['100', 'error in [AutoCast<Decade>]: 100 is obviously not a decade, because it is too large'],
        ['101', 'error in [AutoCast<Decade>]: 101 is obviously not a decade, because it is too large and not a multiple of 10'],
    ],
});

testTypeImpl({
    name: 'NonZeroChance',
    type: number.withConfig('NonZeroChance', { minExclusive: 0, max: 1 }),
    validValues: [0.1, 0.5, 1],
    invalidValues: [
        [0, 'error in [NonZeroChance]: expected a positive number, got: 0'],
        [1.1, 'error in [NonZeroChance]: expected the number 1 or less, got: 1.1'],
    ],
});

testTypeImpl({
    name: 'Depressed',
    type: number.withConfig('Depressed', { minExclusive: -0.1, max: 0 }),
    validValues: [-0.09, -0.05, 0],
    invalidValues: [
        [0.01, 'error in [Depressed]: expected a non-positive number, got: 0.01'],
        [-0.1, 'error in [Depressed]: expected a number greater than -0.1, got: -0.1'],
    ],
});

testTypeImpl({
    name: 'OneOrTwo',
    type: number.withConfig('OneOrTwo', { min: 1, max: 2, multipleOf: 1 }),
    validValues: [1, 2],
    invalidValues: [
        [0, 'error in [OneOrTwo]: expected the number 1 or greater, got: 0'],
        [1.5, 'error in [OneOrTwo]: expected a whole number, got: 1.5'],
        [3, 'error in [OneOrTwo]: expected the number 2 or less, got: 3'],
    ],
});

testTypeImpl({
    name: 'Currency',
    type: number.withConfig('Currency', { multipleOf: 0.01 }),
    validValues: [
        -100.01,
        0,
        100,
        1234567.89,
        12345678.9,
        288.33,
        278.58,
        4651.36,
        1000000.33,
        123456789.2,
        Number.MAX_SAFE_INTEGER,
        Number.MAX_VALUE,
        Number.MAX_VALUE / 10,
    ],
    invalidValues: [-100.111, 123456789.012, 0.001, 100.999, 288.333, 278.581, 4651.369, 1000000.335, 123456789.222].map(v => [
        v,
        `error in [Currency]: expected a multiple of 0.01, got: ${v}`,
    ]),
});

testTypeImpl({
    name: 'Currency',
    type: number.withConfig('Currency', { multipleOf: 0.01, customMessage: { multipleOf: 'use whole cents' } }),
    validValues: [-100.01, 0, 100, 1000000.33, 123456789.2, Number.MAX_VALUE / 100],
    invalidValues: [
        [-100.111, 'error in [Currency]: use whole cents, got: -100.111'],
        [123456789.012, 'error in [Currency]: use whole cents, got: 123456789.012'],
    ],
});

test.each`
    case  | current                                                  | update                                  | expected
    ${0}  | ${{ minExclusive: 1 }}                                   | ${{ min: 2, max: 5 }}                   | ${{ min: 2, max: 5 }}
    ${1}  | ${{ min: 1, maxExclusive: 3 }}                           | ${{ minExclusive: 1, max: 2 }}          | ${{ minExclusive: 1, max: 2 }}
    ${2}  | ${{ min: 1, max: 2, multipleOf: 3 }}                     | ${{ minExclusive: 1, maxExclusive: 2 }} | ${{ multipleOf: 3, minExclusive: 1, maxExclusive: 2 }}
    ${3}  | ${{ minExclusive: 10, maxExclusive: 20, multipleOf: 3 }} | ${{ min: 13, max: 15, multipleOf: 6 }}  | ${{ min: 13, max: 15, multipleOf: 6 }}
    ${4}  | ${{ min: 0, multipleOf: 6 }}                             | ${{ max: 12 }}                          | ${{ min: 0, max: 12, multipleOf: 6 }}
    ${5}  | ${{ minExclusive: 1, maxExclusive: 2 }}                  | ${{ min: 1 }}                           | ${'the new bound (min: 1) is outside the existing bound (minExclusive: 1)'}
    ${6}  | ${{ minExclusive: 1, maxExclusive: 2 }}                  | ${{ max: 2 }}                           | ${'the new bound (max: 2) is outside the existing bound (maxExclusive: 2)'}
    ${7}  | ${{ min: 1, max: 2 }}                                    | ${{ min: 0 }}                           | ${'the new bound (min: 0) is outside the existing bound (min: 1)'}
    ${8}  | ${{ min: 1, max: 2 }}                                    | ${{ max: 3 }}                           | ${'the new bound (max: 3) is outside the existing bound (max: 2)'}
    ${9}  | ${{ multipleOf: 2 }}                                     | ${{ multipleOf: 3 }}                    | ${'new value of multipleOf (3) not compatible with base multipleOf (2)'}
    ${10} | ${{ multipleOf: 0 }}                                     | ${{ multipleOf: 1 }}                    | ${'new value of multipleOf (1) not compatible with base multipleOf (0)'}
`('config sanity case $case', ({ current, update, expected }) => {
    if (typeof expected === 'string') {
        expect(() => number.withConfig('base', current).withConfig('sub', update)).toThrow(expected);
    } else {
        expect(number.withConfig('base', current).withConfig('sub', update).typeConfig).toEqual(expected);
    }
});

test('no autoCastAll', () => {
    expect(autoCastAll(number)).toBe(autoCast(number));
});
