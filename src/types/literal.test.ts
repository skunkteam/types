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
