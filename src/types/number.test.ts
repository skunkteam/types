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
    name: 'number.fromString',
    type: number.fromString,
    invalidValues: [
        ['abc', basicTypeMessage(number.fromString, 'abc')],
        ['123', basicTypeMessage(number.fromString, '123')],
        [NaN, defaultMessage(number.fromString, NaN)],
        ['', basicTypeMessage(number.fromString, '')],
    ],
    validConversions: [
        ['123', 123],
        ['-123.456', -123.456],
    ],
    invalidConversions: [
        ['', 'error in constructor of [number.fromString]: could not convert value to number: ""'],
        ['abc', 'error in constructor of [number.fromString]: could not convert value to number: "abc"'],
        [123, 'error in constructor precondition of [number.fromString]: expected a string, got a number (123)'],
        [NaN, 'error in constructor precondition of [number.fromString]: expected a string, got a number (NaN)'],
    ],
});

testTypeImpl({
    name: 'NonNegativeInt',
    type: int.fromString.withConstraint('NonNegativeInt', n => n >= 0),
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
        ['-1', 'expected a [NonNegativeInt], got: -1'],
        ['1.5', 'error in base type of [NonNegativeInt]: expected an [int], got: 1.5'],
        ['aa', 'error in constructor of [NonNegativeInt]: could not convert value to number: "aa"'],
    ],
});
