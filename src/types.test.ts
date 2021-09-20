/* eslint-disable @typescript-eslint/no-unsafe-return */
import type { DeepUnbranded, MessageDetails, ObjectType, The, Type, Unbranded, Writable } from './interfaces';
import { assignableTo, basicTypeMessage, createExample, defaultMessage, defaultUsualSuspects, testTypeImpl, testTypes } from './testutils';
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
        [-1.5, ['errors in [Age]:', '', '- the unborn miracle, got: -1.5', '', '- expected a whole number, got: -1.5']],
        [1.5, 'error in [Age]: expected a whole number, got: 1.5'],
    ],
});

testTypeImpl({
    name: 'Age.autoCast',
    type: Age.autoCast,
    basicType: 'number',
    validValues: [0, 1, Age.MAX],
    invalidValues: [
        [-1, 'error in [Age.autoCast]: the unborn miracle, got: -1'],
        [Age.MAX + 1, 'error in [Age.autoCast]: wow, that is really old, got: 200'],
        [-1.5, ['errors in [Age.autoCast]:', '', '- the unborn miracle, got: -1.5', '', '- expected a whole number, got: -1.5']],
        [1.5, 'error in [Age.autoCast]: expected a whole number, got: 1.5'],
        ...defaultUsualSuspects(Age.autoCast),
    ],
    validConversions: [
        [`${Age.MAX}`, Age.MAX],
        ['0', 0],
    ],
    invalidConversions: [
        ['abc', 'error in parser of [Age.autoCast]: could not autocast value: "abc"'],
        ['-1', 'error in [Age.autoCast]: the unborn miracle, got: -1, parsed from: "-1"'],
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
    Object {
      "name": Object {
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
        { name: { first: 'a', last: 'b', middle: 'c' }, shoeSize: 0, other: 'props' },
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
        ],
        [
            { name: {}, shoeSize: 1 },
            ['errors in [User]:', '', '- at <name>: missing properties <first> [SmallString] and <last> [LastNameType], got: {}'],
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
        { name: { first: 'a', last: 'b', middle: 'c' }, shoeSize: 0, other: 'props' },
        { name: { first: 'Pete', last: 'Johnson' } },
        { shoeSize: 0, other: 'props' },
        {},
    ],
    invalidValues: [
        ...defaultUsualSuspects(User.toPartial()),
        [
            { name: {} },
            ['errors in [Partial<User>]:', '', '- at <name>: missing properties <first> [SmallString] and <last> [LastNameType], got: {}'],
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
            'Bobby Tables 5',
            [
                'errors in [RestrictedUser]:',
                '',
                '- this User is suspicious',
                '',
                '- in the Bobby Tables detector at <name>: expected a [RestrictedUser], got: { first: "Bobby", last: "Tables" }',
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
        { a: 1, b: 2, additional: 'stuff' },
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
    validValues: [{ id: 'abc' }, { id: 'abc', shoeSize: 4 }],
    invalidValues: [
        [{ id: 'abc', name: 123 }, 'error in [GenericAugmentation<Partial<User>>] at <name>: expected an object, got a number (123)'],
        [{ id: 123 }, 'error in [GenericAugmentation<Partial<User>>] at <id>: expected a string, got a number (123)'],
    ],
});

const NestedParsers = object('NestedParsers', {
    outer: object({ inner: object({ value: number.autoCast }) }).withParser(inner => ({ inner })),
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
                '- at <outer.inner>: missing property <value> [number.autoCast], got: {}',
            ],
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
        ],
    ],
});

testTypeImpl({
    name: 'EdgeCase1',
    type: number.withParser('EdgeCase1', String),
    invalidConversions: [[1, 'error in [EdgeCase1]: expected a number, got a string ("1"), parsed from: 1']],
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

    type WithUser = The<typeof WithUser>;
    const WithUser = MyGenericWrapper(User);
    assignableTo<MyGenericWrapper<User>>(WithUser({}));
    assignableTo<WithUser>(WithUser({}));
    assignableTo<WithUser>({ ok: true, inner: { name: { first: SmallString('first'), last: 'last' }, shoeSize: ShoeSize(5) } });
    assignableTo<MyGenericWrapper<User>>({
        ok: true,
        inner: { name: { first: SmallString('first'), last: 'last' }, shoeSize: ShoeSize(5) },
    });
    assignableTo<{ ok: boolean; inner: User }>({} as MyGenericWrapper<User>);
    assignableTo<{ ok: boolean; inner: User }>({} as WithUser);
});

testTypes('unbranding and literals', () => {
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
    assignableTo<Unbranded<Percentage>>(42);
    assignableTo<DeepUnbranded<Percentage>>(42);
    assignableTo<DeepUnbranded<User>>({ name: { first: 'John', last: 'Doe' }, shoeSize: 48 });
    assignableTo<DeepUnbranded<WithUser>>({ ok: true, inner: { name: { first: 'John', last: 'Doe' }, shoeSize: 48 } });

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

    assignableTo<DeepUnbranded<ComplexBrandedScenario>>({ int: 123, array: [{ name: { first: 'first', last: 'last' }, shoeSize: 12 }] });
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

testTypes('usability of assert', () => {
    const value = {};
    const MyImplicitType = object('MyImplicitType', { a: string });
    const MyExplicitType: Type<{ a: string }> = object('MyExplicitType', { a: string });

    // @ts-expect-error does not work, see: https://github.com/microsoft/TypeScript/issues/34596#issuecomment-548084070
    MyImplicitType.assert(value);

    // Does work:
    MyExplicitType.assert(value);
});

testTypes('type inference', () => {
    function elementOfType<T>(_type: Type<T>): T {
        return 0 as any;
    }

    assignableTo<number>(elementOfType(number));
    assignableTo<ConfirmedAge>(elementOfType(ConfirmedAge));
    assignableTo<User>(elementOfType(User));
    assignableTo<RestrictedUser>(elementOfType(RestrictedUser));
    assignableTo<NestedFromString>(elementOfType(NestedFromString));
    assignableTo<ComplexNesting>(elementOfType(ComplexNesting));
    assignableTo<IntersectionTest>(elementOfType(IntersectionTest));
    assignableTo<MyGenericWrapper<User>>(elementOfType(MyGenericWrapper(User)));
    assignableTo<GenericAugmentation<User>>(elementOfType(GenericAugmentation(User)));

    // @ts-expect-error I still don't know how to fix this for `extendWith`:
    assignableTo<Age>(elementOfType(Age));
});
