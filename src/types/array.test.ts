import { expectTypeOf } from 'expect-type';
import { autoCast, autoCastAll } from '../autocast';
import type { The } from '../interfaces';
import { createExample, defaultUsualSuspects, testTypeImpl } from '../testutils';
import { array } from './array';
import { object } from './interface';
import { undefinedType } from './literal';
import { number } from './number';
import { string } from './string';

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
                'errors in [string[]]:',
                '',
                '- at <[0]>: expected a string, got a number (1)',
                '',
                '- at <[1]>: expected a string, got a number (2)',
                '',
                '- at <[2]>: expected a string, got a number (3)',
            ],
            [
                { path: [0], message: 'expected a string, got a number (1)' },
                { path: [1], message: 'expected a string, got a number (2)' },
                { path: [2], message: 'expected a string, got a number (3)' },
            ],
        ],
        ...defaultUsualSuspects(array(string)),
    ],
});

testTypeImpl({
    name: 'AutoCast<string[]>',
    type: autoCast(array(string)),
    basicType: 'array',
    // wrap arrays inside extra array because of the use of jest.each in testTypeImpl
    validValues: [[['a', 'b', 'bla']], [[]]],
    invalidValues: [
        ['a', 'error in [AutoCast<string[]>]: expected an array, got a string ("a")'],
        [{ 0: 'a', length: 1 }, 'error in [AutoCast<string[]>]: expected an array, got an object ({ "0": "a", length: 1 })'],
        [
            [1, 2, 3],
            [
                'errors in [AutoCast<string[]>]:',
                '',
                '- at <[0]>: expected a string, got a number (1)',
                '',
                '- at <[1]>: expected a string, got a number (2)',
                '',
                '- at <[2]>: expected a string, got a number (3)',
            ],
            [
                { path: [0], message: 'expected a string, got a number (1)' },
                { path: [1], message: 'expected a string, got a number (2)' },
                { path: [2], message: 'expected a string, got a number (3)' },
            ],
        ],
    ],
    validConversions: [
        [undefined, []],
        ['str', ['str']],
    ],
    invalidConversions: [
        [
            1,
            ['errors in [AutoCast<string[]>]:', '(got: [1], parsed from: 1)', '', '- at <[0]>: expected a string, got a number (1)'],
            [{ path: [0], message: 'expected a string, got a number (1)' }],
        ],
    ],
});

testTypeImpl({
    name: 'Array<AutoCast<number>>',
    type: array(autoCast(number)),
    basicType: 'array',
    // wrap arrays inside extra array because of the use of jest.each in testTypeImpl
    validValues: [[[1, 2, 3]], [[]]],
    invalidValues: [
        [1, 'error in [Array<AutoCast<number>>]: expected an array, got a number (1)'],
        [{ 0: 0 }, 'error in [Array<AutoCast<number>>]: expected an array, got an object ({ "0": 0 })'],
        [['1'], 'error in [Array<AutoCast<number>>] at <[0]>: expected a number, got a string ("1")'],
        ...defaultUsualSuspects(array(autoCast(number))),
    ],
    validConversions: [
        [
            ['1', '2', '3'],
            [1, 2, 3],
        ],
    ],
    invalidConversions: [[1, 'error in [Array<AutoCast<number>>]: expected an array, got a number (1)']],
});

testTypeImpl({
    name: 'AutoCast<Array<AutoCast<number>>>',
    type: autoCastAll(array(number)),
    basicType: 'array',
    // wrap arrays inside extra array because of the use of jest.each in testTypeImpl
    validValues: [[[1, 2, 3]], [[]]],
    validConversions: [['1', [1]]],
});

testTypeImpl({
    name: 'AutoCast<(custom name)>',
    type: autoCastAll(array('custom name', number)),
});

type SmallArray = The<typeof SmallArray>;
const SmallArray = array('SmallArray', string, { minLength: 1, maxLength: 3 });

test('SmallArray examples', () => {
    expect(createExample(SmallArray, 0)).toMatchInlineSnapshot(`
        [
          "x",
        ]
    `);

    expect(createExample(SmallArray, 4)).toMatchInlineSnapshot(`
        [
          "xxxxx",
          "xxxxxx",
          "xxxxxxx",
        ]
    `);
});

testTypeImpl({
    name: 'SmallArray',
    type: SmallArray,
    validValues: [[['a']], [['a', 'b', 'c']]],
    invalidValues: [
        [[], 'error in [SmallArray]: expected at least 1 element, got: []'],
        [['a', 'b', 'c', 'd'], 'error in [SmallArray]: expected at most 3 elements, got: ["a", "b", "c", "d"]'],
    ],
});

testTypeImpl({
    name: 'undefined[]',
    type: array(undefinedType),
    validValues: [[[]], [[undefined]], [[undefined, undefined]]],
    invalidValues: [[[null], 'error in [undefined[]] at <[0]>: expected an undefined, got a null']],
});

test('types', () => {
    type MyArray = The<typeof MyArray>;
    const MyArray = array(object({ a: string, b: number }));

    expectTypeOf(MyArray.literal([{ a: 'string', b: 123 }])).toEqualTypeOf<MyArray>();
    expectTypeOf<MyArray>().toEqualTypeOf<Array<{ a: string; b: number }>>();
});

test('correct inference of arrays of branded types', () => {
    type MyBrandedType = The<typeof MyBrandedType>;
    const MyBrandedType = string.withConfig('MyBrandedType', { minLength: 2, maxLength: 2 });
    type MyBrandedTypeArray = The<typeof MyBrandedTypeArray>;
    const MyBrandedTypeArray = array(MyBrandedType);

    expectTypeOf(MyBrandedTypeArray.literal(['ab'])).toEqualTypeOf<MyBrandedType[]>();
    expectTypeOf([MyBrandedType.literal('ab')]).toEqualTypeOf<MyBrandedTypeArray>();
    expectTypeOf(['ab']).not.toEqualTypeOf<MyBrandedTypeArray>();
});
