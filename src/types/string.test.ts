import type { The } from '../interfaces';
import { assignableTo, basicTypeMessage, defaultUsualSuspects, testTypeImpl, testTypes } from '../testutils';
import { pattern, string } from './string';

testTypeImpl({
    name: 'string',
    type: string,
    basicType: 'string',
    validValues: ['', 'a real string'],
    invalidValues: [[123, basicTypeMessage(string, 123)], ...defaultUsualSuspects(string)],
});

type ISODate = The<typeof ISODate>;
const ISODate = pattern('ISODate', /^([12][0-9]{3})-(0[1-9]|1[0-2])-([0-3][0-9])$/, 'expected pattern "YYYY-MM-DD"');
testTypeImpl({
    name: 'ISODate',
    type: ISODate,
    basicType: 'string',
    validValues: ['2020-01-01'],
    invalidValues: [['abc', 'error in [ISODate]: expected pattern "YYYY-MM-DD", got: "abc"']],
});

type CustomMessagePattern = The<typeof CustomMessagePattern>;
const CustomMessagePattern = pattern('CustomMessagePattern', /a/, got => `you said: ${got}, but I expected: "a"`);
testTypeImpl({
    name: 'CustomMessagePattern',
    type: CustomMessagePattern,
    invalidValues: [
        ['b', 'error in [CustomMessagePattern]: you said: "b", but I expected: "a"'],
        ['\\', 'error in [CustomMessagePattern]: you said: "\\\\", but I expected: "a"'],
    ],
});

type NoCustomMessagePattern = The<typeof NoCustomMessagePattern>;
const NoCustomMessagePattern = pattern('NoCustomMessagePattern', /a/);
testTypeImpl({
    name: 'NoCustomMessagePattern',
    type: NoCustomMessagePattern,
    invalidValues: [
        ['b', 'expected a [NoCustomMessagePattern], got: "b"'],
        ['\\', 'expected a [NoCustomMessagePattern], got: "\\\\"'],
    ],
});

testTypes(() => {
    assignableTo<string>(ISODate(0));
    // @ts-expect-error string is not assignable to ISODate
    assignableTo<ISODate>('2000-01-01');
});

testTypeImpl({
    name: 'string.autoCast',
    type: string.autoCast,
    basicType: 'string',
    validValues: ['', '123'],
    validConversions: [
        [Symbol('abc'), 'Symbol(abc)'],
        [123, '123'],
        [{ toString: () => 'ok' }, 'ok'],
    ],
});
test('no autoCastAll', () => {
    expect(string.autoCastAll).toBe(string.autoCast);
});
