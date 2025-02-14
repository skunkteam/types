import { autoCast, autoCastAll } from '../autocast';
import type { MessageDetails, The } from '../interfaces';
import { createExample, defaultUsualSuspects, stripped, testTypeImpl } from '../testutils';
import { printKey, printValue } from '../utils';
import { object } from './interface';
import { keyof } from './keyof';
import { literal } from './literal';
import { int, number } from './number';
import { record } from './record';
import { string } from './string';
import { union } from './union';

testTypeImpl({ name: 'Record<string, { nested: "object" }>', type: record(string, object({ nested: literal('object') })) });
testTypeImpl({ name: 'Record<number, { nested: "object" }>', type: record(number, object({ nested: literal('object') }), false) });
testTypeImpl({
    name: 'Record<"first" | "second", { nested: "object" }>',
    type: record(keyof({ first: 1, second: 2 }), object({ nested: literal('object') })),
});

type StringRecord = The<typeof StringRecord>;
const StringRecord = record('StringRecord', string, object({ nested: literal('object') }));
testTypeImpl({
    name: 'StringRecord',
    type: StringRecord,
    basicType: 'object',
    validValues: [
        { a: { nested: 'object', other: 'props', are: 'ok' }, [stripped]: { a: { nested: 'object' } } },
        { another: { nested: 'object' } },
    ],
    invalidValues: [
        [
            { an: { incorrect: 'nested object' } },
            'error in [StringRecord] at <an>: missing property <nested> ["object"], got: { incorrect: "nested object" }',
        ],
        ...defaultUsualSuspects(StringRecord),
    ],
});

type NumberRecord = The<typeof NumberRecord>;
const NumberRecord = record('NumberRecord', number, autoCast(string));

test('NumberRecord examples', () => {
    expect(createExample(NumberRecord)).toMatchInlineSnapshot(`
        {
          "0.01": "xx",
        }
    `);
});

testTypeImpl({
    name: 'NumberRecord',
    type: NumberRecord,
    basicType: 'object',
    validValues: [{ 1: 'a' }, { '2': 'b' }],
    invalidValues: [
        [
            { a: 'b', c: 'd', 123: 'this is ok, though' },
            [
                'errors in [NumberRecord]:',
                '',
                '- key <a> is invalid: expected key to be numeric (because the key-type is: number), got: "a"',
                '',
                '- key <c> is invalid: expected key to be numeric (because the key-type is: number), got: "c"',
            ],
            [
                { message: 'key <a> is invalid: expected key to be numeric (because the key-type is: number), got: "a"' },
                { message: 'key <c> is invalid: expected key to be numeric (because the key-type is: number), got: "c"' },
            ],
        ],
    ],
    validConversions: [
        [{ 1: 1 }, { 1: '1' }],
        [{ 123: false }, { 123: 'false' }],
    ],
});

type IntRecord = The<typeof IntRecord>;
const IntRecord = record('IntRecord', int, string);

test('IntRecord examples', () => {
    expect(createExample(IntRecord)).toMatchInlineSnapshot(`
        {
          "1": "xx",
        }
    `);
});

testTypeImpl({
    name: 'IntRecord',
    type: IntRecord,
    basicType: 'object',
    validValues: [{ 1: 'a' }, { '2': 'b' }],
    invalidValues: [
        [
            { a: 'b', c: 'd', 123.4: 'not ok', 123: 'ok' },
            [
                'errors in [IntRecord]:',
                '',
                '- key <a> is invalid: expected key to be numeric (because the key-type is: int), got: "a"',
                '',
                '- key <c> is invalid: expected key to be numeric (because the key-type is: int), got: "c"',
                '',
                '- key <"123.4"> is invalid: expected a whole number, got: 123.4',
            ],
            [
                { message: 'key <a> is invalid: expected key to be numeric (because the key-type is: int), got: "a"' },
                { message: 'key <c> is invalid: expected key to be numeric (because the key-type is: int), got: "c"' },
                { message: 'key <"123.4"> is invalid: expected a whole number, got: 123.4' },
            ],
        ],
    ],
});

testTypeImpl({
    name: 'AutoCastAll<IntRecord>',
    type: autoCastAll(IntRecord),
    validConversions: [[{ 1: 1 }, { 1: '1' }]],
});

type NumberLiteralUnionRecord = The<typeof NumberLiteralUnionRecord>;
const NumberLiteralUnionRecord = record('NumberLiteralUnionRecord', union([literal(42), literal(3.14)]), string);
testTypeImpl({
    name: 'NumberLiteralUnionRecord',
    type: NumberLiteralUnionRecord,
    basicType: 'object',
    validValues: [{ 42: 'the answer', 3.14: 'pi' }],
    invalidValues: [
        [
            { '': 'not ok', 123: 'not ok' },
            [
                'errors in [NumberLiteralUnionRecord]:',
                '',
                '- missing properties <"42"> [string] and <"3.14"> [string], got: { "123": "not ok", "": "not ok" }',
                '',
                '- key <"123"> is invalid: in subset of union: expected one of the literals 42 or 3.14, got: 123',
                '',
                '- key <""> is invalid: expected key to be numeric (because the key-type is: 42 | 3.14), got: ""',
            ],
            [
                { message: 'key <"123"> is invalid: in subset of union: expected one of the literals 42 or 3.14, got: 123' },
                { message: 'key <""> is invalid: expected key to be numeric (because the key-type is: 42 | 3.14), got: ""' },
                { message: 'missing property <"42"> [string], got: { "123": "not ok", "": "not ok" }' },
                { message: 'missing property <"3.14"> [string], got: { "123": "not ok", "": "not ok" }' },
            ],
        ],
    ],
});

type StrictKeyofRecord = The<typeof StrictKeyofRecord>;
const StrictKeyofRecord = record('StrictKeyofRecord', keyof({ one: 1, two: 2 }), literal('mississippi'));
testTypeImpl({
    name: 'StrictKeyofRecord',
    type: StrictKeyofRecord,
    basicType: 'object',
    validValues: [{ one: 'mississippi', two: 'mississippi' }],
    invalidValues: [
        [
            {},
            ['errors in [StrictKeyofRecord]:', '', '- missing properties <one> ["mississippi"] and <two> ["mississippi"], got: {}'],
            [
                { message: 'missing property <one> ["mississippi"], got: {}' },
                { message: 'missing property <two> ["mississippi"], got: {}' },
            ],
        ],
        [{ one: 'mississippi' }, 'error in [StrictKeyofRecord]: missing property <two> ["mississippi"], got: { one: "mississippi" }'],
        [
            { one: 'mississippi', two: 'mississippi', three: 'mississippi' },
            'error in [StrictKeyofRecord]: key <three> is invalid: expected one of the literals "one" or "two", got: "three"',
        ],
        [
            { one: 'mississippi', two: 'mississippi', three: 'amazon' },
            'error in [StrictKeyofRecord]: key <three> is invalid: expected one of the literals "one" or "two", got: "three"',
        ],
        [{ one: 'mississippi', two: 'amazon' }, 'error in [StrictKeyofRecord] at <two>: expected the literal "mississippi", got: "amazon"'],
    ],
});

type NonStrictKeyofRecord = The<typeof NonStrictKeyofRecord>;
const NonStrictKeyofRecord = record('NonStrictKeyofRecord', keyof({ one: 1, two: 2 }), literal('mississippi'), false);

test('NonStrictKeyofRecord examples', () => {
    expect(createExample(NonStrictKeyofRecord)).toMatchInlineSnapshot(`
        {
          "one": "mississippi",
          "two": "mississippi",
        }
    `);
});

testTypeImpl({
    name: 'NonStrictKeyofRecord',
    type: NonStrictKeyofRecord,
    basicType: 'object',
    validValues: [
        { one: 'mississippi', two: 'mississippi' },
        { one: 'mississippi', two: 'mississippi', three: 'mississippi', [stripped]: { one: 'mississippi', two: 'mississippi' } },
        { one: 'mississippi', two: 'mississippi', three: 'amazon', [stripped]: { one: 'mississippi', two: 'mississippi' } },
    ],
    invalidValues: [
        [
            {},
            ['errors in [NonStrictKeyofRecord]:', '', '- missing properties <one> ["mississippi"] and <two> ["mississippi"], got: {}'],
            [
                { message: 'missing property <one> ["mississippi"], got: {}' },
                { message: 'missing property <two> ["mississippi"], got: {}' },
            ],
        ],
        [{ one: 'mississippi' }, 'error in [NonStrictKeyofRecord]: missing property <two> ["mississippi"], got: { one: "mississippi" }'],
        [
            { one: 'mississippi', two: 'amazon' },
            'error in [NonStrictKeyofRecord] at <two>: expected the literal "mississippi", got: "amazon"',
        ],
    ],
});

type StrangeRecord = The<typeof StrangeRecord>;
const StrangeRecord = record('StrangeRecord', string, string).withValidation(r =>
    Object.entries(r)
        .filter(([key, value]) => key + key !== value)
        .map(
            ([key, value]): MessageDetails => ({
                kind: 'custom message',
                message: `key: <${printKey(key)}> should have value ${printValue(key + key)}`,
                input: value, // override `input` to be the property value, instead of the complete object
            }),
        ),
);
testTypeImpl({
    name: 'StrangeRecord',
    type: StrangeRecord,
    basicType: 'object',
    validValues: [{ a: 'aa', b: 'bb', de: 'dede' }],
    invalidValues: [
        [
            { a: 'aaa', b: 'bbbb' },
            [
                'errors in [StrangeRecord]:',
                '',
                '- key: <a> should have value "aa", got: "aaa"',
                '',
                '- key: <b> should have value "bb", got: "bbbb"',
            ],
            [{ message: 'key: <a> should have value "aa", got: "aaa"' }, { message: 'key: <b> should have value "bb", got: "bbbb"' }],
        ],
    ],
});
