import { BaseTypeImpl } from './base-type.js';
import type { The } from './interfaces.js';
import { assignableTo, testTypes } from './testutils.js';
import { boolean, int, number, object, pattern, string, unknownRecord } from './types/index.js';

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

    test('#literal', () => {
        type NumericString = The<typeof NumericString>;
        const NumericString = pattern('NumericString', /^\d+$/);

        type Obj = The<typeof Obj>;
        const Obj = object('Obj', { a: NumericString, b: int });

        assignableTo<Obj>({ a: NumericString('123'), b: int(123) });
        // @ts-expect-error because values are not checked
        assignableTo<Obj>({ a: '123', b: 123 });

        expect(Obj.literal({ a: '123', b: 123 })).toEqual({ a: '123', b: 123 });

        assignableTo<Obj>(Obj.literal({ a: '123', b: 123 }));

        expect(() => Obj.literal({ a: 'abc', b: 1.2 })).toThrowErrorMatchingInlineSnapshot(`
            "errors in [Obj]:

            - at <a>: expected a string matching pattern /^\\\\d+$/, got: \\"abc\\"

            - at <b>: expected a whole number, got: 1.2"
        `);
    });
});
