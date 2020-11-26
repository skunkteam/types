/* eslint-disable @typescript-eslint/no-unsafe-return */
import type { FailureDetails, The } from './interfaces';
import { assignableTo, basicTypeMessage, defaultMessage, defaultUsualSuspects, testTypeImpl, testTypes } from './testutils';
import { boolean, int, number, string, type } from './types';
import { partial } from './types/interface';
import { intersection } from './types/intersection';

/** An example of a simple constraint without a custom message. */
const SmallString = string.withConstraint('SmallString', s => s.length < 10);

testTypeImpl({
    name: 'SmallString',
    type: SmallString,
    basicType: 'string',
    validValues: ['', '123456789'],
    invalidValues: [
        ['1234567890', defaultMessage(SmallString, '1234567890')],
        [123, basicTypeMessage(SmallString, 123, string)],
        ...defaultUsualSuspects(SmallString, string),
    ],
});

/** Same constraint as SmallString, but with a custom message. */
const SmallStringCustomMsg = string.withConstraint('SmallString', s => s.length < 10 || `your string "${s}" is too long! :-(`);

testTypeImpl({
    name: 'SmallString',
    type: SmallStringCustomMsg,
    basicType: 'string',
    validValues: ['', '123456789'],
    invalidValues: [
        ['abcdefghijklm', 'error in [SmallString]: your string "abcdefghijklm" is too long! :-('],
        [123, basicTypeMessage(SmallString, 123, string)],
        ...defaultUsualSuspects(SmallString, string),
    ],
});

/** A Percentage must be between 0 and 100 inclusive, with custom error message. */
type Percentage = The<typeof Percentage>;
const Percentage = number.withConstraint('Percentage', n => (n >= 0 && n <= 100) || `should be between 0 and 100 inclusive, got: ${n}`);

testTypeImpl({
    name: 'Percentage',
    type: Percentage,
    basicType: 'number',
    validValues: [0, 10, 100],
    invalidValues: [
        ['a string', basicTypeMessage(Percentage, 'a string', number)],
        [NaN, defaultMessage(Percentage, NaN, number)],
        ['', basicTypeMessage(Percentage, '', number)],
        ...defaultUsualSuspects(Percentage, number),
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
    .withConstraint('Age', n => (n < 0 ? 'the unborn miracle?' : n > 199 ? 'wow, that is really old!' : true))
    .extendWith(() => ({ MAX: 199 }));
type ConfirmedAge = The<typeof ConfirmedAge>;
const ConfirmedAge = Age.withBrand('ConfirmedAge').withConstructor(Age.andThen(age => age % 16));

testTypeImpl({
    name: 'Age',
    type: Age,
    basicType: 'number',
    validValues: [0, 1, Age.MAX],
    invalidValues: [
        [-1, 'error in [Age]: the unborn miracle?'],
        [200, 'error in [Age]: wow, that is really old!'],
        [-1.5, defaultMessage(Age, -1.5, int)],
        [1.5, defaultMessage(Age, 1.5, int)],
    ],
});

testTypeImpl({
    name: 'Age.fromString',
    type: Age.fromString,
    basicType: 'number',
    validValues: [0, 1, Age.MAX],
    invalidValues: [
        [-1, 'error in [Age]: the unborn miracle?'],
        [200, 'error in [Age]: wow, that is really old!'],
        [-1.5, defaultMessage(Age, -1.5, int)],
        [1.5, defaultMessage(Age, 1.5, int)],
        ...defaultUsualSuspects(Age, number),
    ],
    validConversions: [
        [`${Age.MAX}`, Age.MAX],
        ['0', 0],
    ],
    invalidConversions: [
        ['abc', 'error in constructor of [Age.fromString]: could not convert value to number: "abc"'],
        ['-1', 'error in [Age]: the unborn miracle?'],
    ],
});

/** User is a basic interface type. */
const User = type('User', {
    /** The name of the User, split up into a first- and last-name. */
    name: type({
        /** The first name of the User, should not be longer than 9 characters. */
        first: SmallStringCustomMsg,
        /** The last name, has no restrictions. */
        last: string.withName('LastNameType'),
    }),
    /** For reference, we need your shoe size, must be a whole non-negative number. */
    shoeSize: int.withValidation(n => n >= 0 || 'should not be negative'),
});

testTypeImpl({
    name: 'User',
    type: User,
    basicType: 'object',
    validValues: [
        { name: { first: 'Pete', last: 'Johnson' }, shoeSize: 20 },
        { name: { first: 'a', last: 'b', middle: 'c' }, shoeSize: 0, other: 'props' },
    ],
    invalidValues: [
        ...defaultUsualSuspects(User),
        [
            {},
            [
                'encountered multiple errors in [User]:',
                '',
                '- missing properties <name> [{ first: SmallString, last: LastNameType }], <shoeSize> [int], got: {}',
            ],
        ],
        [
            { name: {} },
            [
                'encountered multiple errors in [User]:',
                '',
                '- missing property <shoeSize> [int], got: { name: {} }',
                '',
                '- at <name>: missing properties <first> [SmallString], <last> [LastNameType], got: {}',
            ],
        ],
        [
            { name: {}, shoeSize: 1 },
            [
                'encountered multiple errors in [User]:',
                '',
                '- at <name>: missing properties <first> [SmallString], <last> [LastNameType], got: {}',
            ],
        ],
        [
            { name: { first: 'first' }, shoeSize: 2 },
            'error in [User] at <name>: missing property <last> [LastNameType], got: { first: "first" }',
        ],
        [
            { name: { first: 'I have a long name!' }, shoeSize: -3 },
            [
                'encountered multiple errors in [User]:',
                '',
                '- at <name>: missing property <last> [LastNameType], got: { first: "I have a long name!" }',
                '',
                '- at <shoeSize>: should not be negative',
                '',
                '- at <name.first>: your string "I have a long name!" is too long! :-(',
            ],
        ],
        [
            { name: { first: 'very very long' }, shoeSize: Symbol('4') },
            [
                'encountered multiple errors in [User]:',
                '',
                '- at <name>: missing property <last> [LastNameType], got: { first: "very very long" }',
                '',
                '- in base type at <shoeSize>: expected a number, got a symbol (Symbol(4))',
                '',
                '- at <name.first>: your string "very very long" is too long! :-(',
            ],
        ],
        [
            { name: { first: undefined, last: 'name' }, shoeSize: 5 },
            'error in [User] at base type of <name.first>: expected a string, got an undefined',
        ],
    ],
});

testTypeImpl({
    name: 'Partial<User>',
    type: [User.toPartial(), partial('Partial<User>', User.props)],
    basicType: 'object',
    validValues: [
        { name: { first: 'Pete', last: 'Johnson' }, shoeSize: 20 },
        { name: { first: 'a', last: 'b', middle: 'c' }, shoeSize: 0, other: 'props' },
        { name: { first: 'Pete', last: 'Johnson' } },
        { shoeSize: 0, other: 'props' },
        {},
    ],
    invalidValues: [
        ...defaultUsualSuspects(User.toPartial()),
        [
            { name: {} },
            [
                'encountered multiple errors in [Partial<User>]:',
                '',
                '- at <name>: missing properties <first> [SmallString], <last> [LastNameType], got: {}',
            ],
        ],
        [
            { name: { first: 'incredibly long name' } },
            [
                'encountered multiple errors in [Partial<User>]:',
                '',
                '- at <name>: missing property <last> [LastNameType], got: { first: "incredibly long name" }',
                '',
                '- at <name.first>: your string "incredibly long name" is too long! :-(',
            ],
        ],
        [{ name: { first: 'name', last: 123 } }, 'error in [Partial<User>] at <name.last>: expected a string, got a number (123)'],
        [
            { name: { first: 123, last: 'name' } },
            'error in [Partial<User>] at base type of <name.first>: expected a string, got a number (123)',
        ],
    ],
});

/** RestrictedUser is the User type with additional validation logic. */
const RestrictedUser = User.withConstraint('RestrictedUser', user => {
    const errors: FailureDetails[] = [];
    if (user.name.first === 'Bobby' && user.name.last === 'Tables') {
        errors.push({ type: RestrictedUser, value: user.name, path: ['name'], context: 'the Bobby Tables detector' });
    }
    if (user.name.first.length === 5 && user.name.last.length === 6) {
        errors.push({ type: RestrictedUser, value: user, kind: 'custom message', message: 'this User is suspicious' });
    }
    return errors;
});

testTypeImpl({
    name: 'RestrictedUser',
    type: RestrictedUser,
    basicType: 'object',
    validValues: [{ name: { first: 'Pete', last: 'Johnson' }, shoeSize: 20 }],
    invalidValues: [
        ...defaultUsualSuspects(RestrictedUser, User),
        // constraints are fired after the type is deemed structurally valid:
        [
            { name: { first: 'Bobby', last: 'Tables' } },
            'error in base type of [RestrictedUser]: missing property <shoeSize> [int], got: { name: { first: "Bobby", last: "Tables" } }',
        ],
        [{ name: { first: 'Bobbx', last: 'Tablex' }, shoeSize: 5 }, 'error in [RestrictedUser]: this User is suspicious'],
        [
            { name: { first: 'Bobby', last: 'Tables' }, shoeSize: 5 },
            [
                'encountered multiple errors in [RestrictedUser]:',
                '',
                '- this User is suspicious',
                '',
                '- in the Bobby Tables detector at <name>: expected a [RestrictedUser], got: { first: "Bobby", last: "Tables" }',
            ],
        ],
    ],
});

/** NestedFromString is an interface type that uses other types with constructors. */
const NestedFromString = type('NestedFromString', { a: number.fromString, b: number.fromString });

testTypeImpl({
    name: 'NestedFromString',
    type: NestedFromString,
    basicType: 'object',
    validValues: [
        { a: 1, b: 2 },
        { a: 1, b: 2, additional: 'stuff' },
    ],
    invalidValues: [
        ...defaultUsualSuspects(NestedFromString),
        [
            { a: '1', b: '2' },
            [
                'encountered multiple errors in [NestedFromString]:',
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
        [{ a: 1, b: '2' }, 'error in [NestedFromString] at constructor precondition of <a>: expected a string, got a number (1)'],
        [
            { a: 1, b: 2 },
            [
                'encountered multiple errors in [NestedFromString]:',
                '',
                '- in constructor precondition at <a>: expected a string, got a number (1)',
                '',
                '- in constructor precondition at <b>: expected a string, got a number (2)',
            ],
        ],
        [
            { a: 'a' },
            [
                'encountered multiple errors in [NestedFromString]:',
                '',
                '- missing property <b> [number.fromString], got: { a: "a" }',
                '',
                '- in constructor at <a>: could not convert value to number: "a"',
            ],
        ],
    ],
});

type IntersectionTest = The<typeof IntersectionTest>;
const IntersectionTest = intersection('IntersectionTest', [
    type({
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
                'encountered multiple errors in [IntersectionTest]:',
                '',
                '- missing property <nr> [number], got: { first: {} }',
                '',
                '- in base type at <first>: expected a string, got an object ({})',
            ],
        ],
        [
            { nr: true, ok: 1 },
            [
                'encountered multiple errors in [IntersectionTest]:',
                '',
                '- at <nr>: expected a number, got a boolean (true)',
                '',
                '- at <ok>: expected a boolean, got a number (1)',
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
        type({ a: number }).withOptional({ b: User.toPartial() }),
        intersection([type({ a: number }), partial({ b: partial('Partial<User>', User.props) })]),
    ],
    basicType: 'object',
    validValues: [{ a: 1 }, { a: 2, b: {} }, { a: 2, b: { shoeSize: 4 } }],
    invalidValues: [
        [{}, 'error in [{ a: number, b?: Partial<User> }]: missing property <a> [number], got: {}'],
        [
            { a: 123, b: { name: { first: 'too long a name' }, shoeSize: -5 } },
            [
                'encountered multiple errors in [{ a: number, b?: Partial<User> }]:',
                '',
                '- at <b.name>: missing property <last> [LastNameType], got: { first: "too long a name" }',
                '',
                '- at <b.shoeSize>: should not be negative',
                '',
                '- at <b.name.first>: your string "too long a name" is too long! :-(',
            ],
        ],
    ],
});

// Historic bug: `withValidation` did not take constructed result of prior validation into account.
const ShoutMessage = type('ShoutMessage', {
    msg: string.withConstructor(string.andThen(s => s + '!')),
}).withValidation(o => o.msg.endsWith('!') || 'speak up');
testTypeImpl({
    name: 'ShoutMessage',
    type: ShoutMessage,
    basicType: 'object',
    validValues: [{ msg: 'a!' }, { msg: '!' }],
    invalidValues: [[{ msg: 'a' }, 'error in [ShoutMessage]: speak up']],
    validConversions: [[{ msg: 'a' }, { msg: 'a!' }]],
});

// Static types tests

testTypes('TypeOf', () => {
    const aString: The<typeof string> = 'a string';
    const aNumber: The<typeof number> = 123;

    assignableTo<The<typeof string>>('a string');
    assignableTo<string>(aString);
    // @ts-expect-error number not assignable to string
    assignableTo<The<typeof string>>(123);
    // @ts-expect-error string not assignable to number
    assignableTo<number>(aString);

    assignableTo<The<typeof number>>(123);
    assignableTo<number>(aNumber);

    // @ts-expect-error string not assignable to number
    assignableTo<The<typeof number>>('a string');
    // @ts-expect-error number not assignable to string
    assignableTo<string>(aNumber);

    // Branded values: Percentage is assignable to number, but number is not assignable to Percentage.

    assignableTo<Percentage>(Percentage(50));
    assignableTo<number>(Percentage(50));
    // @ts-expect-error number not assignable to Percentage
    assignableTo<Percentage>(123);
});

testTypes('assignability of sub-brands', () => {
    assignableTo<number>(Age(123));
    assignableTo<int>(Age(123));
    assignableTo<Age>(Age(123));
    // @ts-expect-error int not assignable to Age
    assignableTo<Age>(int(123));
    // @ts-expect-error number not assignable to Age
    assignableTo<Age>(123);

    assignableTo<number>(ConfirmedAge(123));
    assignableTo<int>(ConfirmedAge(123));
    assignableTo<Age>(ConfirmedAge(123));
    assignableTo<ConfirmedAge>(ConfirmedAge(123));

    // @ts-expect-error number not assignable to CheckedAge
    assignableTo<ConfirmedAge>(123);

    // @ts-expect-error int not assignable to CheckedAge
    assignableTo<ConfirmedAge>(int(123));

    // @ts-expect-error Age not assignable to CheckedAge
    assignableTo<ConfirmedAge>(Age(123));
});
