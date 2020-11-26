import type { The } from '../interfaces';
import { assignableTo, basicTypeMessage, defaultUsualSuspects, testTypeImpl, testTypes } from '../testutils';
import { string } from './string';

testTypeImpl({
    name: 'string',
    type: string,
    basicType: 'string',
    validValues: ['', 'a real string'],
    invalidValues: [[123, basicTypeMessage(string, 123)], ...defaultUsualSuspects(string)],
});

type ISODate = The<typeof ISODate>;
const ISODate = string.withRegexpConstraint('ISODate', /^([12][0-9]{3})-(0[1-9]|1[0-2])-([0-3][0-9])$/);
testTypeImpl({
    name: 'ISODate',
    type: ISODate,
    basicType: 'string',
    validValues: ['2020-01-01'],
    invalidValues: [['abc', 'expected an [ISODate], got: "abc"']],
});

testTypes(() => {
    assignableTo<string>(ISODate(0));
    // @ts-expect-error string is not assignable to ISODate
    assignableTo<ISODate>('2000-01-01');
});

testTypeImpl({
    name: 'string.fromUnknown',
    type: string.fromUnknown,
    basicType: 'string',
    validValues: ['', '123'],
    validConversions: [
        [Symbol('abc'), 'Symbol(abc)'],
        [123, '123'],
        [{ toString: () => 'ok' }, 'ok'],
    ],
});
