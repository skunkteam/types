/* eslint-disable @typescript-eslint/no-unsafe-return */
import { StandardSchemaV1 } from '@standard-schema/spec';
import { expectTypeOf } from 'expect-type';
import { autoCast } from './autocast';
import type { DeepUnbranded, MessageDetails, ObjectType, The, Type, Unbranded, Writable } from './interfaces';
import { basicTypeMessage, createExample, defaultMessage, defaultUsualSuspects, stripped, testTypeImpl } from './testutils';
import { array, boolean, int, number, object, string } from './types';
import { partial } from './types/interface';
import { intersection } from './types/intersection';
import { printValue } from './utils';

/** An example of a simple constraint without a custom message. */
const SmallString = string.withConstraint('SmallString', s => s.length < 10);

testTypeImpl({
    name: 'SmallString',
    type: SmallString,
    basicType: 'string',
    validValues: ['', '123456789'],
    invalidValues: [
        ['1234567890', defaultMessage(SmallString, '1234567890')],
        [123, basicTypeMessage(SmallString, 123)],
        ...defaultUsualSuspects(SmallString),
    ],
});

/** Same constraint as SmallString, but with a custom message. */
const SmallStringCustomMsg = string.withConstraint(
    'SmallString',
    s => s.length < 10 || { kind: 'custom message', message: `your string ${printValue(s)} is too long! :-(`, omitInput: true },
);

testTypeImpl({
    name: 'SmallString',
    type: SmallStringCustomMsg,
    basicType: 'string',
    validValues: ['', '123456789'],
    invalidValues: [
        ['abcdefghijklm', 'error in [SmallString]: your string "abcdefghijklm" is too long! :-('],
        [123, basicTypeMessage(SmallString, 123)],
        ...defaultUsualSuspects(SmallString),
    ],
});

/** A Percentage must be between 0 and 100 inclusive, with custom error message. */
type Percentage = The<typeof Percentage>;
const Percentage = number.withConfig('Percentage', {
    min: 0,
    max: 100,
    customMessage: 'should be between 0 and 100 inclusive',
});

testTypeImpl({
    name: 'Percentage',
    type: Percentage,
    basicType: 'number',
    validValues: [0, 10, 100],
    invalidValues: [
        ['a string', basicTypeMessage(Percentage, 'a string')],
        [NaN, defaultMessage(Percentage, NaN)],
        ['', basicTypeMessage(Percentage, '')],
        ...defaultUsualSuspects(Percentage),
        [101, 'error in [Percentage]: should be between 0 and 100 inclusive, got: 101'],
        [-1, 'error in [Percentage]: should be between 0 and 100 inclusive, got: -1'],
    ],
});

/**
 * Age is an example of a constraint on top of another constraint, is a double branded type, assignable to int, but not the other way
 * around.
 */
type Age = The<typeof Age>;
const Age = int
    .withConfig('Age', {
        min: 0,
        maxExclusive: 200,
        customMessage: {
            min: 'the unborn miracle',
            max: 'wow, that is really old',
        },
    })
    .extendWith(() => ({ MAX: 199 }));
type ConfirmedAge = The<typeof ConfirmedAge>;
const ConfirmedAge = Age.withBrand('ConfirmedAge').withParser(Age.andThen(age => age % 16));

testTypeImpl({
    name: 'Age',
    type: Age,
    basicType: 'number',
    validValues: [0, 1, Age.MAX],
    invalidValues: [
        [-1, 'error in [Age]: the unborn miracle, got: -1'],
        [Age.MAX + 1, 'error in [Age]: wow, that is really old, got: 200'],
        [
            -1.5,
            ['errors in [Age]:', '', '- the unborn miracle, got: -1.5', '', '- expected a whole number, got: -1.5'],
            [{ message: 'the unborn miracle, got: -1.5' }, { message: 'expected a whole number, got: -1.5' }],
        ],
        [1.5, 'error in [Age]: expected a whole number, got: 1.5'],
    ],
});

testTypeImpl({
    name: 'AutoCast<Age>',
    type: autoCast(Age),
    basicType: 'number',
    validValues: [0, 1, Age.MAX],
    invalidValues: [
        [-1, 'error in [AutoCast<Age>]: the unborn miracle, got: -1'],
        [Age.MAX + 1, 'error in [AutoCast<Age>]: wow, that is really old, got: 200'],
        [-1.5, ['errors in [AutoCast<Age>]:', '', '- the unborn miracle, got: -1.5', '', '- expected a whole number, got: -1.5']],
        [1.5, 'error in [AutoCast<Age>]: expected a whole number, got: 1.5'],
        ...defaultUsualSuspects(autoCast(Age)),
    ],
    validConversions: [
        [`${Age.MAX}`, Age.MAX],
        ['0', 0],
    ],
    invalidConversions: [
        ['abc', 'error in parser of [AutoCast<Age>]: could not autocast value: "abc"'],
        ['-1', 'error in [AutoCast<Age>]: the unborn miracle, got: -1, parsed from: "-1"'],
    ],
});

testTypeImpl({ name: 'ConfirmedAge', type: ConfirmedAge, validConversions: [[18, 2]] });

type ShoeSize = The<typeof ShoeSize>;
const ShoeSize = int.withConfig('ShoeSize', { min: 0, customMessage: { min: 'should not be negative' } });

/** User is a basic interface type. */
type User = The<typeof User>;
const User = object('User', {
    /** The name of the User, split up into a first- and last-name. */
    name: object({
        /** The first name of the User, should not be longer than 9 characters. */
        first: SmallStringCustomMsg,
        /** The last name, has no restrictions. */
        last: string.withName('LastNameType'),
    }),
    /** For reference, we need your shoe size, must be a whole non-negative number. */
    shoeSize: ShoeSize,
});

test('User example', () => {
    expect(createExample(User)).toMatchInlineSnapshot(`
        {
          "name": {
            "first": "x",
            "last": "xx",
          },
          "shoeSize": 3,
        }
    `);
});

testTypeImpl({
    name: 'User',
    type: User,
    basicType: 'object',
    validValues: [
        { name: { first: 'Pete', last: 'Johnson' }, shoeSize: 20 },
        {
            name: { first: 'a', last: 'b', middle: 'c' },
            shoeSize: 0,
            other: 'props',
            [stripped]: { name: { first: 'a', last: 'b' }, shoeSize: 0 },
        },
    ],
    invalidValues: [
        ...defaultUsualSuspects(User),
        [
            {},
            [
                'errors in [User]:',
                '',
                '- missing properties <name> [{ first: SmallString, last: LastNameType }] and <shoeSize> [ShoeSize], got: {}',
            ],
            [
                { message: 'missing property <name> [{ first: SmallString, last: LastNameType }], got: {}' },
                { message: 'missing property <shoeSize> [ShoeSize], got: {}' },
            ],
        ],
        [
            { name: {} },
            [
                'errors in [User]:',
                '',
                '- missing property <shoeSize> [ShoeSize], got: { name: {} }',
                '',
                '- at <name>: missing properties <first> [SmallString] and <last> [LastNameType], got: {}',
            ],
            [
                { message: 'missing property <shoeSize> [ShoeSize], got: { name: {} }' },
                { path: ['name'], message: 'missing property <first> [SmallString], got: {}' },
                { path: ['name'], message: 'missing property <last> [LastNameType], got: {}' },
            ],
        ],
        [
            { name: {}, shoeSize: 1 },
            ['errors in [User]:', '', '- at <name>: missing properties <first> [SmallString] and <last> [LastNameType], got: {}'],
            [
                { path: ['name'], message: 'missing property <first> [SmallString], got: {}' },
                { path: ['name'], message: 'missing property <last> [LastNameType], got: {}' },
            ],
        ],
        [
            { name: { first: 'first' }, shoeSize: 2 },
            'error in [User] at <name>: missing property <last> [LastNameType], got: { first: "first" }',
        ],
        [
            { name: { first: 'I have a long name!' }, shoeSize: -3 },
            [
                'errors in [User]:',
                '',
                '- at <name>: missing property <last> [LastNameType], got: { first: "I have a long name!" }',
                '',
                '- at <shoeSize>: should not be negative, got: -3',
                '',
                '- at <name.first>: your string "I have a long name!" is too long! :-(',
            ],
            [
                { path: ['name'], message: 'missing property <last> [LastNameType], got: { first: "I have a long name!" }' },
                { path: ['shoeSize'], message: 'should not be negative, got: -3' },
                { path: ['name', 'first'], message: 'your string "I have a long name!" is too long! :-(' },
            ],
        ],
        [
            { name: { first: 'very very long' }, shoeSize: Symbol('4') },
            [
                'errors in [User]:',
                '',
                '- at <name>: missing property <last> [LastNameType], got: { first: "very very long" }',
                '',
                '- at <shoeSize>: expected a number, got a symbol ([Symbol: 4])',
                '',
                '- at <name.first>: your string "very very long" is too long! :-(',
            ],
            [
                { path: ['name'], message: 'missing property <last> [LastNameType], got: { first: "very very long" }' },
                { path: ['shoeSize'], message: 'expected a number, got a symbol ([Symbol: 4])' },
                { path: ['name', 'first'], message: 'your string "very very long" is too long! :-(' },
            ],
        ],
        [{ name: { first: undefined, last: 'name' }, shoeSize: 5 }, 'error in [User] at <name.first>: expected a string, got an undefined'],
    ],
});

testTypeImpl({
    name: 'Partial<User>',
    type: [User.toPartial(), partial('Partial<User>', User.props)],
    basicType: 'object',
    validValues: [
        { name: { first: 'Pete', last: 'Johnson' }, shoeSize: 20 },
        {
            name: { first: 'a', last: 'b', middle: 'c' },
            shoeSize: 0,
            other: 'props',
            [stripped]: { name: { first: 'a', last: 'b' }, shoeSize: 0 },
        },
        { name: { first: 'Pete', last: 'Johnson' } },
        { shoeSize: 0, other: 'props', [stripped]: { shoeSize: 0 } },
        { shoeSize: 0 },
        {},
    ],
    invalidValues: [
        ...defaultUsualSuspects(User.toPartial()),
        [
            { name: {} },
            ['errors in [Partial<User>]:', '', '- at <name>: missing properties <first> [SmallString] and <last> [LastNameType], got: {}'],
            [
                { path: ['name'], message: 'missing property <first> [SmallString], got: {}' },
                { path: ['name'], message: 'missing property <last> [LastNameType], got: {}' },
            ],
        ],
        [
            { name: { first: 'incredibly long name' } },
            [
                'errors in [Partial<User>]:',
                '',
                '- at <name>: missing property <last> [LastNameType], got: { first: "incredibly long name" }',
                '',
                '- at <name.first>: your string "incredibly long name" is too long! :-(',
            ],
            [
                { path: ['name'], message: 'missing property <last> [LastNameType], got: { first: "incredibly long name" }' },
                { path: ['name', 'first'], message: 'your string "incredibly long name" is too long! :-(' },
            ],
        ],
        [{ name: { first: 'name', last: 123 } }, 'error in [Partial<User>] at <name.last>: expected a string, got a number (123)'],
        [{ name: { first: 123, last: 'name' } }, 'error in [Partial<User>] at <name.first>: expected a string, got a number (123)'],
    ],
});

/** RestrictedUser is the User type with additional validation logic. */
type RestrictedUser = The<typeof RestrictedUser>;
const RestrictedUser = User.withConstraint('RestrictedUser', user => {
    const errors: MessageDetails[] = [];
    if (user.name.first === 'Bobby' && user.name.last === 'Tables') {
        errors.push({ input: user.name, path: ['name'], context: 'the Bobby Tables detector' });
    }
    if (user.name.first.length === 5 && user.name.last.length === 6) {
        errors.push({ kind: 'custom message', message: 'this User is suspicious', omitInput: true });
    }
    return errors;
}).withParser(i => {
    if (typeof i !== 'string') {
        return i;
    }
    const [first, last, shoeSize] = i.split(' ');
    return { name: { first, last }, shoeSize: +shoeSize };
});

testTypeImpl({
    name: 'RestrictedUser',
    type: RestrictedUser,
    basicType: 'object',
    validValues: [{ name: { first: 'Pete', last: 'Johnson' }, shoeSize: 20 }],
    invalidValues: [
        ...defaultUsualSuspects(RestrictedUser),
        // constraints are fired after the type is deemed structurally valid:
        [
            { name: { first: 'Bobby', last: 'Tables' } },
            'error in [RestrictedUser]: missing property <shoeSize> [ShoeSize], got: { name: { first: "Bobby", last: "Tables" } }',
        ],
        [{ name: { first: 'Bobbx', last: 'Tablex' }, shoeSize: 5 }, 'error in [RestrictedUser]: this User is suspicious'],
        [
            { name: { first: 'Bobby', last: 'Tables' }, shoeSize: 5 },
            [
                'errors in [RestrictedUser]:',
                '',
                '- this User is suspicious',
                '',
                '- in the Bobby Tables detector at <name>: expected a [RestrictedUser], got: { first: "Bobby", last: "Tables" }',
            ],
        ],
    ],
    validConversions: [['Pete Johnson 20', { name: { first: 'Pete', last: 'Johnson' }, shoeSize: 20 }]],
    invalidConversions: [
        [
            { name: { first: 'Bobby', last: 'Tables' } },
            'error in [RestrictedUser]: missing property <shoeSize> [ShoeSize], got: { name: { first: "Bobby", last: "Tables" } }',
        ],
        [{ name: { first: 'Bobbx', last: 'Tablex' }, shoeSize: 5 }, 'error in [RestrictedUser]: this User is suspicious'],
        [
            'Bobby Tables 5',
            [
                'errors in [RestrictedUser]:',
                '',
                '- this User is suspicious',
                '',
                '- in the Bobby Tables detector at <name>: expected a [RestrictedUser], got: { first: "Bobby", last: "Tables" }',
            ],
            [
                { message: 'this User is suspicious' },
                { path: ['name'], message: 'expected a [RestrictedUser], got: { first: "Bobby", last: "Tables" }' },
            ],
        ],
        [
            'Pete',
            [
                'errors in [RestrictedUser]:',
                '(got: { name: { first: "Pete", last: undefined }, shoeSize: NaN }, parsed from: "Pete")',
                '',
                '- at <shoeSize>: expected a [ShoeSize], got: NaN',
                '',
                '- at <name.last>: expected a string, got an undefined',
            ],
            [
                { path: ['shoeSize'], message: 'expected a [ShoeSize], got: NaN' },
                { path: ['name', 'last'], message: 'expected a string, got an undefined' },
            ],
        ],
    ],
});

/** NestedFromString is an interface type that uses other types with constructors. */
const NumberFromString = number.withParser(
    string.andThen(n => {
        if (isNaN(+n)) throw 'could not convert value to number';
        return +n;
    }),
);
type NestedFromString = The<typeof NestedFromString>;
const NestedFromString = object('NestedFromString', { a: NumberFromString, b: NumberFromString });

testTypeImpl({
    name: 'NestedFromString',
    type: NestedFromString,
    basicType: 'object',
    validValues: [
        { a: 1, b: 2 },
        { a: 1, b: 2, additional: 'stuff', [stripped]: { a: 1, b: 2 } },
    ],
    invalidValues: [
        ...defaultUsualSuspects(NestedFromString),
        [
            { a: '1', b: '2' },
            [
                'errors in [NestedFromString]:',
                '',
                '- at <a>: expected a number, got a string ("1")',
                '',
                '- at <b>: expected a number, got a string ("2")',
            ],
        ],
    ],
    validConversions: [
        [
            { a: '1', b: '2' },
            { a: 1, b: 2 },
        ],
        [
            { a: '1', b: '2', additional: 'stuff' },
            { a: 1, b: 2 },
        ],
    ],
    invalidConversions: [
        ...defaultUsualSuspects(NestedFromString),
        [{ a: 1, b: '2' }, 'error in [NestedFromString] at parser precondition of <a>: expected a string, got a number (1)'],
        [
            { a: 1, b: 2 },
            [
                'errors in [NestedFromString]:',
                '',
                '- in parser precondition at <a>: expected a string, got a number (1)',
                '',
                '- in parser precondition at <b>: expected a string, got a number (2)',
            ],
            [
                { path: ['a'], message: 'expected a string, got a number (1)' },
                { path: ['b'], message: 'expected a string, got a number (2)' },
            ],
        ],
        [
            { a: 'a' },
            [
                'errors in [NestedFromString]:',
                '',
                '- missing property <b> [number], got: { a: "a" }',
                '',
                '- in parser at <a>: could not convert value to number, got: "a"',
            ],
            [
                { message: 'missing property <b> [number], got: { a: "a" }' },
                { path: ['a'], message: 'could not convert value to number, got: "a"' },
            ],
        ],
    ],
});

type ComplexNesting = The<typeof ComplexNesting>;
const ComplexNesting = object('ComplexNesting', {
    pos: NumberFromString.withValidation(n => n > 0 || 'should be positive'),
    neg: NumberFromString.withValidation(n => n < 0 || 'should be negative'),
})
    .withValidation(obj => obj.pos === -obj.neg || '<pos> and <neg> should be opposites')
    .withParser(i => (typeof i === 'string' ? { pos: i, neg: `-${i}` } : i))
    .extendWith(() => ({ example: { pos: 42, neg: -42 } }));

testTypeImpl({
    name: 'ComplexNesting',
    type: ComplexNesting,
    validValues: [{ pos: 4, neg: -4 }],
    invalidValues: [
        [{ pos: -2, neg: -2 }, 'error in [ComplexNesting] at <pos>: should be positive, got: -2'],
        [{ pos: 2, neg: -1 }, 'error in [ComplexNesting]: <pos> and <neg> should be opposites, got: { pos: 2, neg: -1 }'],
    ],
    validConversions: [
        ['1', { pos: 1, neg: -1 }],
        [
            { pos: '2', neg: '-2' },
            { pos: 2, neg: -2 },
        ],
    ],
    invalidConversions: [
        [1, 'error in [ComplexNesting]: expected an object, got a number (1)'],
        [
            '-1',
            [
                'errors in [ComplexNesting]:',
                '(got: { pos: "-1", neg: "--1" }, parsed from: "-1")',
                '',
                '- at <pos>: should be positive, got: -1, parsed from: "-1"',
                '',
                '- in parser at <neg>: could not convert value to number, got: "--1"',
            ],
            [
                { path: ['pos'], message: 'should be positive, got: -1, parsed from: "-1"' },
                { path: ['neg'], message: 'could not convert value to number, got: "--1"' },
            ],
        ],
        [
            { pos: '2', neg: '-3' },
            'error in [ComplexNesting]: <pos> and <neg> should be opposites, got: { pos: 2, neg: -3 }, parsed from: { pos: "2", neg: "-3" }',
        ],
    ],
});

type IntersectionTest = The<typeof IntersectionTest>;
const IntersectionTest = intersection('IntersectionTest', [
    object({
        /** The number */
        nr: number,
    }),
    partial({
        /** The optional boolean */
        ok: boolean,
    }),
    User.props.name.toPartial(),
    NestedFromString.toPartial(),
]);

testTypeImpl({
    name: 'IntersectionTest',
    type: IntersectionTest,
    basicType: 'object',
    validValues: [{ nr: 1 }, { nr: 2, ok: true }, { nr: -1.2, b: 456 }, { nr: 4, last: 'name', a: 123 }],
    invalidValues: [
        ...defaultUsualSuspects(IntersectionTest),
        [
            { first: {} },
            [
                'errors in [IntersectionTest]:',
                '',
                '- missing property <nr> [number], got: { first: {} }',
                '',
                '- at <first>: expected a string, got an object ({})',
            ],
            [
                { message: 'missing property <nr> [number], got: { first: {} }' },
                { path: ['first'], message: 'expected a string, got an object ({})' },
            ],
        ],
        [
            { nr: true, ok: 1 },
            [
                'errors in [IntersectionTest]:',
                '',
                '- at <nr>: expected a number, got a boolean (true)',
                '',
                '- at <ok>: expected a boolean, got a number (1)',
            ],
            [
                { path: ['nr'], message: 'expected a number, got a boolean (true)' },
                { path: ['ok'], message: 'expected a boolean, got a number (1)' },
            ],
        ],
    ],
    validConversions: [
        [
            { nr: 1, ok: false, first: 'first', last: 'last', a: '123', b: '456' },
            { nr: 1, ok: false, first: 'first', last: 'last', a: 123, b: 456 },
        ],
    ],
});

testTypeImpl({
    name: '{ a: number, b?: Partial<User> }',
    type: [
        object({ a: number }).withOptional({ b: User.toPartial() }),
        object({ a: number }).mergeWith(partial({ b: User.toPartial() })),
        intersection([object({ a: number }), partial({ b: partial('Partial<User>', User.props) })]),
    ],
    basicType: 'object',
    validValues: [{ a: 1 }, { a: 2, b: {} }, { a: 2, b: { shoeSize: 4 } }],
    invalidValues: [
        [{}, 'error in [{ a: number, b?: Partial<User> }]: missing property <a> [number], got: {}'],
        [
            { a: 123, b: { name: { first: 'too long a name' }, shoeSize: -5 } },
            [
                'errors in [{ a: number, b?: Partial<User> }]:',
                '',
                '- at <b.name>: missing property <last> [LastNameType], got: { first: "too long a name" }',
                '',
                '- at <b.shoeSize>: should not be negative, got: -5',
                '',
                '- at <b.name.first>: your string "too long a name" is too long! :-(',
            ],
            [
                { path: ['b', 'name'], message: 'missing property <last> [LastNameType], got: { first: "too long a name" }' },
                { path: ['b', 'shoeSize'], message: 'should not be negative, got: -5' },
                { path: ['b', 'name', 'first'], message: 'your string "too long a name" is too long! :-(' },
            ],
        ],
    ],
});

// Historic bug: `withValidation` did not take constructed result of prior validation into account.
const ShoutMessage = object('ShoutMessage', {
    msg: string.withParser(string.andThen(s => s + '!')),
}).withValidation(o => o.msg.endsWith('!') || { kind: 'custom message', message: 'speak up', omitInput: true });
testTypeImpl({
    name: 'ShoutMessage',
    type: ShoutMessage,
    basicType: 'object',
    validValues: [{ msg: 'a!' }, { msg: '!' }],
    invalidValues: [[{ msg: 'a' }, 'error in [ShoutMessage]: speak up']],
    validConversions: [[{ msg: 'a' }, { msg: 'a!' }]],
    invalidConversions: [[{ msg: 1 }, 'error in [ShoutMessage] at parser precondition of <msg>: expected a string, got a number (1)']],
});

// Multiple calls to withValidation should be possible
const Question = object('Question', { msg: string })
    .withValidation(({ msg }) => msg.endsWith('?') || 'should end with "?"')
    .withValidation(({ msg }) => msg.startsWith('¿') || 'should start with "¿"')
    .extendWith(() => ({ example: { msg: '¿Una pregunta?' } }));
testTypeImpl({
    name: 'Question',
    type: Question,
    validValues: [{ msg: '¿Una pregunta?' }],
    invalidValues: [
        [{ msg: 'No questions.' }, 'error in [Question]: should end with "?", got: { msg: "No questions." }'],
        [{ msg: 'Any questions?' }, 'error in [Question]: should start with "¿", got: { msg: "Any questions?" }'],
    ],
});

type MyGenericWrapper<T> = { ok: boolean; inner: T };
function MyGenericWrapper<T>(inner: Type<T>): ObjectType<MyGenericWrapper<T>> {
    return object(`MyGenericWrapper<${inner.name}>`, { ok: boolean, inner });
}

testTypeImpl({
    name: 'MyGenericWrapper<string>',
    type: MyGenericWrapper(string),
    basicType: 'object',
    validValues: [{ ok: true, inner: 'string' }],
    invalidValues: [[{ ok: false, inner: 123 }, 'error in [MyGenericWrapper<string>] at <inner>: expected a string, got a number (123)']],
});

testTypeImpl({
    name: 'MyGenericWrapper<Partial<User>>',
    type: MyGenericWrapper(User.toPartial()),
    basicType: 'object',
    validValues: [
        { ok: true, inner: {} },
        { ok: true, inner: { shoeSize: 4 } },
    ],
    invalidValues: [
        [{ ok: false, inner: 123 }, 'error in [MyGenericWrapper<Partial<User>>] at <inner>: expected an object, got a number (123)'],
    ],
});

type GenericAugmentation<T> = T & { id: string };
function GenericAugmentation<T>(inner: ObjectType<T>): ObjectType<GenericAugmentation<Writable<T>>> {
    return intersection(`GenericAugmentation<${inner.name}>`, [inner, object({ id: string })]);
}

testTypeImpl({
    name: 'GenericAugmentation<Partial<User>>',
    type: GenericAugmentation(User.toPartial()),
    basicType: 'object',
    validValues: [{ id: 'abc' }, { shoeSize: 4, id: 'abc' }],
    invalidValues: [
        [{ id: 'abc', name: 123 }, 'error in [GenericAugmentation<Partial<User>>] at <name>: expected an object, got a number (123)'],
        [{ id: 123 }, 'error in [GenericAugmentation<Partial<User>>] at <id>: expected a string, got a number (123)'],
    ],
});

const NestedParsers = object('NestedParsers', {
    outer: object({ inner: object({ value: autoCast(number) }) }).withParser(inner => ({ inner })),
}).withParser(outer => ({ outer }));

testTypeImpl({
    name: 'NestedParsers',
    type: NestedParsers,
    validValues: [{ outer: { inner: { value: 123 } } }],
    validConversions: [[{ value: '123' }, { outer: { inner: { value: 123 } } }]],
    invalidConversions: [
        [
            {},
            [
                'errors in [NestedParsers]:',
                // Only showing outer parse-result here by design as we have not yet found with a decent way to show multiple translations
                // and especially how they are related without bloating the error report.
                '(got: { outer: {} }, parsed from: {})',
                '',
                '- at <outer.inner>: missing property <value> [AutoCast<number>], got: {}',
            ],
            [{ path: ['outer', 'inner'], message: 'missing property <value> [AutoCast<number>], got: {}' }],
        ],
        [
            { value: 'received' },
            [
                'errors in [NestedParsers]:',
                // Only showing outer parse-result here by design as we have not yet found with a decent way to show multiple translations
                // and especially how they are related without bloating the error report.
                '(got: { outer: { value: "received" } }, parsed from: { value: "received" })',
                '',
                '- in parser at <outer.inner.value>: could not autocast value: "received"',
            ],
            [{ path: ['outer', 'inner', 'value'], message: 'could not autocast value: "received"' }],
        ],
    ],
});

type ReplacedAutocastParser = The<typeof ReplacedAutocastParser>;
const ReplacedAutocastParser = autoCast(number).withParser({ name: 'ReplacedAutocastParser', chain: false }, input => input);

testTypeImpl({
    name: 'ReplacedAutocastParser',
    type: ReplacedAutocastParser,
    validValues: [-1, 0, 1, 100],
    validConversions: [[1, 1]],
    invalidConversions: [['1', 'error in [ReplacedAutocastParser]: expected a number, got a string ("1")']],
});

type ChainedAutocastParser = The<typeof ChainedAutocastParser>;
const ChainedAutocastParser = autoCast(number).withParser({ name: 'ChainedAutocastParser', chain: true }, input => input);

testTypeImpl({
    name: 'ChainedAutocastParser',
    type: ChainedAutocastParser,
    validValues: [-1, 0, 1, 100],
    validConversions: [
        [1, 1],
        ['1', 1],
    ],
});

type ChainedParserParser = The<typeof ChainedParserParser>;
const ChainedParserParser = number
    .withValidation(n => n < 115 || 'inner validation failed')
    .withParser(
        'Inner',
        number.withValidation(n => n < 110 || 'inner parser failed').andThen(input => input + 10),
    )
    .withParser(
        { name: 'ChainedParserParser', chain: true },
        number.withValidation(n => n < 100 || 'outer parser failed').andThen(input => input + 100),
    );

// The valid ranges of ChainedParserParser:
// outer parser: input < 100
// inner parser: input < 10 (because outer parser adds 100)
// validation:   input < 5 (because the parsers add 110 in total)

testTypeImpl({
    name: 'ChainedParserParser',
    type: ChainedParserParser,
    validValues: [-1, 0, 1, 100],
    validConversions: [
        [1, 111],
        [-110, 0],
    ],
    invalidConversions: [
        [100, 'error in parser precondition of [ChainedParserParser]: outer parser failed, got: 100'],
        [10, 'error in parser precondition of [Inner]: inner parser failed, got: 110, parsed from: 10'],
        [5, 'error in [ChainedParserParser]: inner validation failed, got: 115, parsed from: 5'],
    ],
});

testTypeImpl({
    name: 'EdgeCase1',
    type: number.withParser('EdgeCase1', String),
    invalidConversions: [[1, 'error in [EdgeCase1]: expected a number, got a string ("1"), parsed from: 1']],
});

// Static types tests

test('TypeOf', () => {
    expectTypeOf(string('abc')).toEqualTypeOf<string>();
    expectTypeOf(number(123)).toEqualTypeOf<number>();
    expectTypeOf<The<typeof string>>().toEqualTypeOf<string>();
    expectTypeOf<The<typeof number>>().toEqualTypeOf<number>();

    // Branded values: Percentage is assignable to number, but number is not assignable to Percentage.

    expectTypeOf(Percentage(50)).toEqualTypeOf<Percentage>();
    expectTypeOf<Percentage>().toMatchTypeOf<number>();
    expectTypeOf<number>().not.toMatchTypeOf<Percentage>();

    type WithUser = The<typeof WithUser>;
    const WithUser = MyGenericWrapper(User);
    expectTypeOf<WithUser>().toEqualTypeOf<MyGenericWrapper<User>>();
    expectTypeOf<WithUser>().toEqualTypeOf<{ ok: boolean; inner: User }>();
    expectTypeOf({
        ok: true,
        inner: { name: { first: SmallString('first'), last: 'last' }, shoeSize: ShoeSize(5) },
    }).toEqualTypeOf<WithUser>();
});

test('standard schema conformance', () => {
    expectTypeOf(standardValidate(string)).toEqualTypeOf<string>();
    expectTypeOf(standardValidate(number)).toEqualTypeOf<number>();
    expectTypeOf(standardValidate(Age)).toEqualTypeOf<Age>();
    expectTypeOf(standardValidate(User)).toEqualTypeOf<User>();

    function standardValidate<T extends StandardSchemaV1>(schema: T): StandardSchemaV1.InferOutput<T> {
        return schema; // BS, we're only interested in the types in the signature of this function
    }
});

test('unbranding and literals', () => {
    User.literal({
        name: {
            first: 'John',
            last: 'Doe',
        },
        shoeSize: 48,
    });
    type WithUser = The<typeof WithUser>;
    const WithUser = MyGenericWrapper(User);
    WithUser.literal({
        ok: true,
        inner: {
            name: { first: 'John', last: 'Doe' },
            shoeSize: 48,
        },
    });
    expectTypeOf<Percentage>().not.toEqualTypeOf<number>();
    expectTypeOf<Unbranded<Percentage>>().toEqualTypeOf<number>();
    expectTypeOf<DeepUnbranded<Percentage>>().toEqualTypeOf<number>();
    expectTypeOf<DeepUnbranded<User>>().toEqualTypeOf<{ name: { first: string; last: string }; shoeSize: number }>();
    expectTypeOf<DeepUnbranded<WithUser>>().toEqualTypeOf<{ ok: boolean; inner: DeepUnbranded<User> }>();

    type ComplexBrandedScenario = The<typeof ComplexBrandedScenario>;
    const ComplexBrandedScenario = object({
        int,
        array: array(
            User.withOptional({
                optional: int,
            }).withConstraint('SpecialUser', () => true),
        ).withConstraint('SpecialArray', () => true),
    })
        .withOptional({ optional: SmallString })
        .withConstraint('SpecialObject', () => true);

    expectTypeOf<DeepUnbranded<ComplexBrandedScenario>>().toHaveProperty('int').toEqualTypeOf<number>();
    expectTypeOf<DeepUnbranded<ComplexBrandedScenario>>().toHaveProperty('optional').toEqualTypeOf<string | undefined>();
    expectTypeOf<DeepUnbranded<ComplexBrandedScenario>>()
        .toHaveProperty('array')
        .toEqualTypeOf<Array<{ name: { first: string; last: string }; shoeSize: number; optional?: number }>>();
});

test('assignability of sub-brands', () => {
    expectTypeOf(Age(123)).toEqualTypeOf<Age>();
    expectTypeOf<Age>().toMatchTypeOf<int>();
    expectTypeOf<Age>().toMatchTypeOf<number>();
    expectTypeOf<int>().not.toMatchTypeOf<Age>();
    expectTypeOf<number>().not.toMatchTypeOf<Age>();

    expectTypeOf(ConfirmedAge(123)).toEqualTypeOf<ConfirmedAge>();
    expectTypeOf<ConfirmedAge>().toMatchTypeOf<Age>();
    expectTypeOf<ConfirmedAge>().toMatchTypeOf<int>();
    expectTypeOf<ConfirmedAge>().toMatchTypeOf<number>();
    expectTypeOf<int>().not.toMatchTypeOf<ConfirmedAge>();
    expectTypeOf<number>().not.toMatchTypeOf<ConfirmedAge>();
    expectTypeOf<Age>().not.toMatchTypeOf<ConfirmedAge>();
});

test('usability of assert', () => {
    const value = { a: 'string' };
    const MyImplicitType = object('MyImplicitType', { a: string });
    const MyExplicitType: Type<{ a: string }> = object('MyExplicitType', { a: string });

    // @ts-expect-error does not work, see: https://github.com/microsoft/TypeScript/issues/34596#issuecomment-548084070
    MyImplicitType.assert(value);

    // Does work:
    MyExplicitType.assert(value);
});

test('type inference', () => {
    function elementOfType<T>(_type: Type<T> | ObjectType<T>): T {
        return 0 as any;
    }

    expectTypeOf(elementOfType(number)).toEqualTypeOf<number>();
    expectTypeOf(elementOfType(ConfirmedAge)).toEqualTypeOf<ConfirmedAge>();
    expectTypeOf(elementOfType(User)).toEqualTypeOf<User>();
    expectTypeOf(elementOfType(RestrictedUser)).toEqualTypeOf<RestrictedUser>();
    expectTypeOf(elementOfType(NestedFromString)).toEqualTypeOf<NestedFromString>();
    expectTypeOf(elementOfType(ComplexNesting)).toEqualTypeOf<ComplexNesting>();
    expectTypeOf(elementOfType(IntersectionTest)).toEqualTypeOf<IntersectionTest>();
    expectTypeOf(elementOfType(MyGenericWrapper(User))).toEqualTypeOf<MyGenericWrapper<User>>();
    expectTypeOf(elementOfType(GenericAugmentation(User))).toEqualTypeOf<GenericAugmentation<User>>();

    // I still don't know how to fix this for `extendWith`:
    expectTypeOf(elementOfType(Age)).toEqualTypeOf<number>();
    expectTypeOf(elementOfType(Age)).not.toEqualTypeOf<Age>();
});
