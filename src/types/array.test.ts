import { number } from './number';
import { assignableTo, defaultUsualSuspects, testTypeImpl, testTypes } from '../testutils';
import { array } from './array';
import { string } from './string';
import { type } from './interface';
import type { The } from '../interfaces';

testTypeImpl({
    name: 'string[]',
    type: array(string),
    basicType: 'array',
    // wrap arrays inside extra array because of the use of jest.each in testTypeImpl
    validValues: [[['a', 'b', 'bla']], [[]]],
    invalidValues: [
        ['a', 'error in [string[]]: expected an array, got a string ("a")'],
        [{ 0: 'a' }, 'error in [string[]]: expected an array, got an object ({ "0": "a" })'],
        [
            [1, 2, 3],
            [
                'encountered multiple errors in [string[]]:',
                '',
                '- at <[0]>: expected a string, got a number (1)',
                '',
                '- at <[1]>: expected a string, got a number (2)',
                '',
                '- at <[2]>: expected a string, got a number (3)',
            ],
        ],
        ...defaultUsualSuspects(array(string)),
    ],
});

testTypeImpl({
    name: 'Array<number.fromString>',
    type: array(number.fromString),
    basicType: 'array',
    // wrap arrays inside extra array because of the use of jest.each in testTypeImpl
    validValues: [[[1, 2, 3]], [[]]],
    invalidValues: [
        [1, 'error in [Array<number.fromString>]: expected an array, got a number (1)'],
        [{ 0: 0 }, 'error in [Array<number.fromString>]: expected an array, got an object ({ "0": 0 })'],
        [['1'], 'error in [Array<number.fromString>] at <[0]>: expected a number, got a string ("1")'],
        ...defaultUsualSuspects(array(number.fromString)),
    ],
    validConversions: [
        [
            ['1', '2', '3'],
            [1, 2, 3],
        ],
    ],
    invalidConversions: [
        [
            [1, 2, 3],
            [
                'encountered multiple errors in [Array<number.fromString>]:',
                '',
                '- in constructor precondition at <[0]>: expected a string, got a number (1)',
                '',
                '- in constructor precondition at <[1]>: expected a string, got a number (2)',
                '',
                '- in constructor precondition at <[2]>: expected a string, got a number (3)',
            ],
        ],
    ],
});

testTypes(() => {
    type MyArray = The<typeof MyArray>;
    const MyArray = array(type({ a: string, b: number }));

    assignableTo<MyArray>([
        { a: 'string', b: 1 },
        { a: 'another string', b: 2 },
    ]);
    assignableTo<Array<{ a: string; b: number }>>(MyArray(0));

    // @ts-expect-error wrong element type
    assignableTo<MyArray>([1]);
});
