import { BaseTypeImpl } from './base-type.js';
import { isType } from './type-guard.js';
import { InterfaceType, object, string } from './types/index.js';

describe(isType, () => {
    test('correctly identify types', () => {
        expect(isType(string)).toBeTrue();
        expect(isType(string.withConstraint('SomeType', s => s))).toBeTrue();
        expect(isType(object({}))).toBeTrue();

        expect(isType(BaseTypeImpl)).toBeFalse();
        expect(isType(InterfaceType)).toBeFalse();
        expect(isType(() => 0)).toBeFalse();
    });
});
