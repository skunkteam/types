import { int, number } from './number';
import { basicTypeMessage, defaultMessage, defaultUsualSuspects, testTypeImpl } from '../testutils';

testTypeImpl({
    name: 'number',
    type: number,
    basicType: 'number',
    validValues: [0, -Infinity, Infinity, -10.5, 10, 10.123],
    invalidValues: [
        ['123', basicTypeMessage(number, '123')],
        [NaN, defaultMessage(number, NaN)],
        ['', basicTypeMessage(number, '')],
        ...defaultUsualSuspects(number),
    ],
});

testTypeImpl({
    name: 'int',
    type: int,
    validValues: [0, -0, -10, 10, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER],
    invalidValues: [
        [NaN, defaultMessage(int, NaN, number)],
        ['a string', basicTypeMessage(int, 'a string', number)],
        ['', basicTypeMessage(int, '', number)],
        [-10.5, defaultMessage(int, -10.5)],
        [10.123, defaultMessage(int, 10.123)],
        [-Infinity, defaultMessage(int, -Infinity)],
        [Infinity, defaultMessage(int, Infinity)],
        ...defaultUsualSuspects(int, number),
    ],
});

testTypeImpl({
    name: 'number.autoCast',
    type: number.autoCast,
    invalidValues: [
        ['abc', basicTypeMessage(number.autoCast, 'abc')],
        ['123', basicTypeMessage(number.autoCast, '123')],
        [NaN, defaultMessage(number.autoCast, NaN)],
        ['', basicTypeMessage(number.autoCast, '')],
    ],
    validConversions: [
        [123, 123],
        ['123', 123],
        ['-123.456', -123.456],
    ],
    invalidConversions: [
        ['', 'error in parser of [number.autoCast]: could not autocast value: ""'],
        ['abc', 'error in parser of [number.autoCast]: could not autocast value: "abc"'],
        [NaN, 'error in parser of [number.autoCast]: could not autocast value: NaN'],
    ],
});

testTypeImpl({
    name: 'NonNegativeInt',
    type: int.autoCast.withConstraint('NonNegativeInt', n => n >= 0),
    validValues: [0, 1, 10_000],
    invalidValues: [
        ['4', 'error in base type of [NonNegativeInt]: expected a number, got a string ("4")'],
        [-1, 'expected a [NonNegativeInt], got: -1'],
        [1.5, 'error in base type of [NonNegativeInt]: expected an [int], got: 1.5'],
    ],
    validConversions: [
        ['0', 0],
        ['100', 100],
    ],
    invalidConversions: [
        ['-1', 'expected a [NonNegativeInt], got: -1, parsed from: "-1"'],
        ['1.5', 'error in base type of [NonNegativeInt]: expected an [int], got: 1.5, parsed from: "1.5"'],
        ['aa', 'error in parser of [NonNegativeInt]: could not autocast value: "aa"'],
    ],
});
