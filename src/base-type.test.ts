import { number, string } from './types';
import { BaseTypeImpl } from './base-type';
import { assignableTo, testTypes } from './testutils';
import { boolean, unknownRecord } from './types';

describe(BaseTypeImpl, () => {
    test.each(['a string', 123, false, { key: 'value' }] as const)('guard value: %p', value => {
        if (string.is(value)) {
            assignableTo<'a string'>(value);
            assignableTo<typeof value>('a string');
            expect(value).toBe('a string');
        }
        if (number.is(value)) {
            assignableTo<123>(value);
            assignableTo<typeof value>(123);
            expect(value).toBe(123);
        }
        if (boolean.is(value)) {
            assignableTo<false>(value);
            assignableTo<typeof value>(false);
            expect(value).toBe(false);
        }
        if (unknownRecord.is(value)) {
            assignableTo<{ key: 'value' }>(value);
            assignableTo<typeof value>({ key: 'value' });
            expect(value).toEqual({ key: 'value' });
        }

        testTypes(() => {
            string.assert(value);
            assignableTo<'a string'>(value);
            assignableTo<typeof value>('a string');
        });

        testTypes(() => {
            number.assert(value);
            assignableTo<123>(value);
            assignableTo<typeof value>(123);
        });

        testTypes(() => {
            boolean.assert(value);
            assignableTo<false>(value);
            assignableTo<typeof value>(false);
        });

        testTypes(() => {
            unknownRecord.assert(value);
            assignableTo<{ key: 'value' }>(value);
            assignableTo<typeof value>({ key: 'value' });
        });
    });
});
