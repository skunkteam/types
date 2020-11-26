import { BaseTypeImpl } from './base-type';
import { isType } from './type-guard';
import { InterfaceType, string, StringType, type } from './types';

describe(isType, () => {
    test('correctly identify types', () => {
        expect(isType(string)).toBeTrue();
        expect(isType(string.withConstraint('SomeType', s => s))).toBeTrue();
        expect(isType(type({}))).toBeTrue();

        expect(isType(BaseTypeImpl)).toBeFalse();
        expect(isType(StringType)).toBeFalse();
        expect(isType(InterfaceType)).toBeFalse();
        expect(isType(() => 0)).toBeFalse();
    });
});
