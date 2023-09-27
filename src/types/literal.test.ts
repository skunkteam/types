import type { The } from '../interfaces.js';
import { assignableTo, testTypeImpl, testTypes } from '../testutils.js';
import { literal, nullType, undefinedType } from './literal.js';

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
    name: 'false.autoCast',
    type: literal(false).autoCast,
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
        ['FALSE', 'error in parser of [false.autoCast]: could not autocast value: "FALSE"'],
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
    name: '"specific string".autoCast',
    type: literal('specific string').autoCast,
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
    name: 'null.autoCast',
    type: nullType.autoCast,
    basicType: 'null',
    validValues: [null],
    invalidValues: [[undefined, 'expected a null, got an undefined']],
    validConversions: [
        [null, null],
        [undefined, null],
    ],
    invalidConversions: [[0, 'error in parser of [null.autoCast]: could not autocast value: 0']],
});

testTypeImpl({
    name: 'undefined.autoCast',
    type: undefinedType.autoCast,
    basicType: 'undefined',
    validValues: [undefined],
    invalidValues: [[null, 'expected an undefined, got a null']],
    validConversions: [
        [null, undefined],
        [undefined, undefined],
    ],
    invalidConversions: [[0, 'error in parser of [undefined.autoCast]: could not autocast value: 0']],
});

testTypeImpl({
    name: '42.autoCast',
    type: literal(42).autoCast,
    validValues: [42],
    invalidValues: [['42', 'expected a number (42), got a string ("42")']],
    validConversions: [['42', 42]],
});

testTypes('literal', () => {
    type MyLiteral = The<typeof MyLiteral>;
    const MyLiteral = literal('some value');

    assignableTo<'some value'>(MyLiteral('some value'));
    assignableTo<MyLiteral>('some value');
});
