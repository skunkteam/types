import { The } from '../interfaces';
import { testTypeImpl } from '../testutils';
import { boolean } from './boolean';
import { object, partial } from './interface';
import { number } from './number';
import { pick, pickProperties, pickPropertiesInfo } from './pick';
import { string } from './string';

type TestType = The<typeof TestType>;
const TestType = object('TestType', {
    a: string,
    b: boolean,
    c: number,
});

type PartialTestType = The<typeof PartialTestType>;
const PartialTestType = partial('PartialTestType', {
    d: string,
    e: number,
});

type pickme = The<typeof pickme>;
const pickme = pick(TestType, ['b', 'c']);

testTypeImpl({
    name: `Pick<TestType, 'b' | 'c'>`,
    type: pickme,
    basicType: 'object',
    validValues: [
        { b: true, c: 5 },
        { b: false, c: -2 },
    ],
});

describe('Other', () => {
    test('pickProperties', () => {
        expect(pickProperties(TestType.props, ['a', 'b'])).toEqual({
            a: string,
            b: boolean,
        });
    });
    test('pickPropertiesInfo', () => {
        expect(pickPropertiesInfo(TestType.propsInfo, ['a', 'b'])).toEqual({
            a: {
                partial: false,
                type: string,
            },
            b: {
                partial: false,
                type: boolean,
            },
        });
        expect(pickPropertiesInfo(PartialTestType.propsInfo, ['d'])).toEqual({
            d: {
                partial: true,
                type: string,
            },
        });
    });
});
