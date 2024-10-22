import { expectTypeOf } from 'expect-type';
import { autoCast, autoCastAll } from '../autocast';
import type { The } from '../interfaces';
import { basicTypeMessage, defaultUsualSuspects, testTypeImpl } from '../testutils';
import { plural } from '../utils';
import { pattern, string } from './string';

testTypeImpl({
    name: 'string',
    type: string,
    basicType: 'string',
    validValues: ['', 'a real string', '\uD800', '\n\t'],
    invalidValues: [[123, basicTypeMessage(string, 123)], ...defaultUsualSuspects(string)],
});

type ISODate = The<typeof ISODate>;
const ISODate = pattern('ISODate', /^([12][0-9]{3})-(0[1-9]|1[0-2])-([0-3][0-9])$/, 'expected pattern "YYYY-MM-DD"').extendWith(() => ({
    example: '2020-01-02',
}));
testTypeImpl({
    name: 'ISODate',
    type: ISODate,
    basicType: 'string',
    validValues: ['2020-01-01'],
    invalidValues: [['abc', 'error in [ISODate]: expected pattern "YYYY-MM-DD", got: "abc"']],
});

type CustomMessagePattern = The<typeof CustomMessagePattern>;
const CustomMessagePattern = pattern('CustomMessagePattern', /a/, got => `you said: ${got}, but I expected: "a"`).extendWith(() => ({
    example: 'aaa',
}));
testTypeImpl({
    name: 'CustomMessagePattern',
    type: CustomMessagePattern,
    validValues: ['a', 'aa', 'aaa'],
    invalidValues: [
        ['b', 'error in [CustomMessagePattern]: you said: "b", but I expected: "a"'],
        ['\\', 'error in [CustomMessagePattern]: you said: "\\\\", but I expected: "a"'],
    ],
});

type NoCustomMessagePattern = The<typeof NoCustomMessagePattern>;
const NoCustomMessagePattern = pattern('NoCustomMessagePattern', /a/).extendWith(() => ({ example: 'aaa' }));
testTypeImpl({
    name: 'NoCustomMessagePattern',
    type: NoCustomMessagePattern,
    invalidValues: [
        ['b', 'error in [NoCustomMessagePattern]: expected a string matching pattern /a/, got: "b"'],
        ['\\', 'error in [NoCustomMessagePattern]: expected a string matching pattern /a/, got: "\\\\"'],
    ],
});

type CombinedValidations = The<typeof CombinedValidations>;
const CombinedValidations = string
    .withConfig('CombinedValidations', {
        pattern: /^[ab]*(?:ab|ba)[ab]*$/,
        minLength: 4,
        maxLength: 6,
        customMessage: {
            minLength: (got, value) => `you're ${4 - value.length} ${plural(4 - value.length, 'character')} short, got: ${got}`,
            pattern: `you're supposed to use only a's and b's and at least one of both`,
        },
    })
    .extendWith(() => ({ example: 'aaabb' }));
testTypeImpl({
    name: 'CombinedValidations',
    type: CombinedValidations,
    basicType: 'string',
    validValues: ['abab', 'aaabbb', 'bbba'],
    invalidValues: [
        [
            'c',
            [
                'errors in [CombinedValidations]:',
                '',
                `- you're 3 characters short, got: "c"`,
                '',
                `- you're supposed to use only a's and b's and at least one of both, got: "c"`,
            ],
        ],
        ['aaaabbbb', 'error in [CombinedValidations]: expected at most 6 characters, got: "aaaabbbb"'],
    ],
});

test('types', () => {
    expectTypeOf(ISODate('2000-01-01')).toEqualTypeOf<ISODate>();
    expectTypeOf(ISODate('2000-01-01')).toMatchTypeOf<string>();
    expectTypeOf('2000-01-01').not.toMatchTypeOf<ISODate>();
});

testTypeImpl({
    name: 'AutoCast<string>',
    type: autoCast(string),
    basicType: 'string',
    validValues: ['', '123'],
    validConversions: [
        [false, 'false'],
        [123, '123'],
        [BigInt(123), '123'],
        ['abc', 'abc'],
    ],
    invalidConversions: [
        [null, 'error in parser of [AutoCast<string>]: could not autocast value: null'],
        [undefined, 'error in parser of [AutoCast<string>]: could not autocast value: undefined'],
        [Symbol('abc'), 'error in parser of [AutoCast<string>]: could not autocast value: [Symbol: abc]'],
        [Symbol.iterator, 'error in parser of [AutoCast<string>]: could not autocast value: [Symbol: Symbol.iterator]'],
        [{ prop: 'value' }, 'error in parser of [AutoCast<string>]: could not autocast value: { prop: "value" }'],
        [{ toString: () => 'ok' }, 'error in parser of [AutoCast<string>]: could not autocast value: "ok"'],
        [function myFunc() {}, 'error in parser of [AutoCast<string>]: could not autocast value: [Function: myFunc]'],
    ],
});
test('no autoCastAll', () => {
    expect(autoCastAll(string)).toBe(autoCast(string));
});
