import { expectTypeOf } from 'expect-type';
import { autoCast } from '../autocast';
import type { The } from '../interfaces';
import { testTypeImpl } from '../testutils';
import { literal, nullType, undefinedType } from './literal';

testTypeImpl({
    name: 'false',
    type: literal(false),
    basicType: 'boolean',
    validValues: [false],
    invalidValues: [
        [true, 'expected the literal false, got: true'],
        [NaN, 'expected a boolean (false), got a number (NaN)'],
        [null, 'expected a boolean (false), got a null'],
        [undefined, 'expected a boolean (false), got an undefined'],
        [0, 'expected a boolean (false), got a number (0)'],
        [1, 'expected a boolean (false), got a number (1)'],
    ],
});

testTypeImpl({
    name: 'AutoCast<false>',
    type: autoCast(literal(false)),
    basicType: 'boolean',
    validValues: [false],
    invalidValues: [
        [true, 'expected the literal false, got: true'],
        [NaN, 'expected a boolean (false), got a number (NaN)'],
        [null, 'expected a boolean (false), got a null'],
        [undefined, 'expected a boolean (false), got an undefined'],
        [0, 'expected a boolean (false), got a number (0)'],
    ],
    validConversions: [
        [false, false],
        ['false', false],
        [0, false],
    ],
    invalidConversions: [
        [true, 'expected the literal false, got: true'],
        [1, 'expected the literal false, got: true, parsed from: 1'],
        ['FALSE', 'error in parser of [AutoCast<false>]: could not autocast value: "FALSE"'],
    ],
});

testTypeImpl({
    name: '"specific string"',
    type: literal('specific string'),
    basicType: 'string',
    validValues: ['specific string'],
    invalidValues: [
        ['another string', 'expected the literal "specific string", got: "another string"'],
        [123, 'expected a string ("specific string"), got a number (123)'],
    ],
});

testTypeImpl({
    name: 'AutoCast<"specific string">',
    type: autoCast(literal('specific string')),
    validValues: ['specific string'],
    invalidValues: [[{ toString: () => 'specific string' }, 'expected a string ("specific string"), got an object ("specific string")']],
    validConversions: [[{ toString: () => 'specific string' }, 'specific string']],
});

testTypeImpl({
    name: 'null',
    type: nullType,
    basicType: 'null',
    validValues: [null],
    invalidValues: [
        [false, 'expected a null, got a boolean (false)'],
        [true, 'expected a null, got a boolean (true)'],
        [NaN, 'expected a null, got a number (NaN)'],
        [undefined, 'expected a null, got an undefined'],
        [0, 'expected a null, got a number (0)'],
        [1, 'expected a null, got a number (1)'],
    ],
});

testTypeImpl({
    name: 'undefined',
    type: undefinedType,
    basicType: 'undefined',
    validValues: [undefined],
    invalidValues: [
        [false, 'expected an undefined, got a boolean (false)'],
        [true, 'expected an undefined, got a boolean (true)'],
        [NaN, 'expected an undefined, got a number (NaN)'],
        [null, 'expected an undefined, got a null'],
        [0, 'expected an undefined, got a number (0)'],
        [1, 'expected an undefined, got a number (1)'],
    ],
});

testTypeImpl({
    name: 'AutoCast<null>',
    type: autoCast(nullType),
    basicType: 'null',
    validValues: [null],
    invalidValues: [[undefined, 'expected a null, got an undefined']],
    validConversions: [
        [null, null],
        [undefined, null],
    ],
    invalidConversions: [[0, 'error in parser of [AutoCast<null>]: could not autocast value: 0']],
});

testTypeImpl({
    name: 'AutoCast<undefined>',
    type: autoCast(undefinedType),
    basicType: 'undefined',
    validValues: [undefined],
    invalidValues: [[null, 'expected an undefined, got a null']],
    validConversions: [
        [null, undefined],
        [undefined, undefined],
    ],
    invalidConversions: [[0, 'error in parser of [AutoCast<undefined>]: could not autocast value: 0']],
});

testTypeImpl({
    name: 'AutoCast<42>',
    type: autoCast(literal(42)),
    validValues: [42],
    invalidValues: [['42', 'expected a number (42), got a string ("42")']],
    validConversions: [['42', 42]],
});

test('literal', () => {
    type MyLiteral = The<typeof MyLiteral>;
    const MyLiteral = literal('some value');

    expectTypeOf(MyLiteral('some value')).toEqualTypeOf<MyLiteral>;
    expectTypeOf<MyLiteral>().toEqualTypeOf<'some value'>();
});
