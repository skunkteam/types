import assert from 'assert';
import { BaseTypeImpl } from './base-type';
import type { The } from './interfaces';
import { assignableTo, testTypes } from './testutils';
import { boolean, int, literal, number, object, pattern, string, undefinedType, unknownRecord } from './types';

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

        const array = [value, value];
        if (array.every(string.is)) {
            assignableTo<'a string'[]>(array);
            assignableTo<typeof array>(['a string']);
            expect(array).toEqual(['a string', 'a string']);
        } else if (array.every(number.is)) {
            assignableTo<123[]>(array);
            assignableTo<typeof array>([123]);
            expect(array).toEqual([123, 123]);
        } else if (array.every(boolean.is)) {
            assignableTo<false[]>(array);
            assignableTo<typeof array>([false]);
            expect(array).toEqual([false, false]);
        } else if (array.every(unknownRecord.is)) {
            assignableTo<{ key: 'value' }[]>(array);
            assignableTo<typeof array>([{ key: 'value' }]);
            expect(array).toEqual([{ key: 'value' }, { key: 'value' }]);
        } else {
            assert.fail('should have matched one of the other predicates');
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

    test('guard value: unknown', () => {
        const value = undefined as unknown;
        if (string.is(value)) {
            assignableTo<string>(value);
            assignableTo<typeof value>('a string');
        }
        if (number.is(value)) {
            assignableTo<number>(value);
            assignableTo<typeof value>(123);
        }
        if (boolean.is(value)) {
            assignableTo<boolean>(value);
            assignableTo<typeof value>(false);
        }
        if (unknownRecord.is(value)) {
            assignableTo<unknownRecord>(value);
            assignableTo<typeof value>({ key: 'value' });
        }
        expect(undefinedType.is(value)).toBeTrue();
        if (undefinedType.is(value)) {
            assignableTo<undefined>(value);
            assignableTo<typeof value>(undefined);
        }

        const array = [value, value];
        if (array.every(string.is)) {
            assignableTo<string[]>(array);
            assignableTo<typeof array>(['a string']);
        } else if (array.every(number.is)) {
            assignableTo<number[]>(array);
            assignableTo<typeof array>([123]);
        } else if (array.every(boolean.is)) {
            assignableTo<boolean[]>(array);
            assignableTo<typeof array>([false]);
        } else if (array.every(unknownRecord.is)) {
            assignableTo<unknownRecord[]>(array);
            assignableTo<typeof array>([{ key: 'value' }]);
        } else if (array.every(undefinedType.is)) {
            assignableTo<undefined[]>(array);
            assignableTo<typeof array>([undefined]);
        } else {
            assert.fail('should have matched the last predicate');
        }

        testTypes(() => {
            string.assert(value);
            assignableTo<string>(value);
            assignableTo<typeof value>('a string');
        });

        testTypes(() => {
            number.assert(value);
            assignableTo<number>(value);
            assignableTo<typeof value>(123);
        });

        testTypes(() => {
            boolean.assert(value);
            assignableTo<boolean>(value);
            assignableTo<typeof value>(false);
        });

        testTypes(() => {
            unknownRecord.assert(value);
            assignableTo<unknownRecord>(value);
            assignableTo<typeof value>({ key: 'value' });
        });
    });

    test('guard objects', () => {
        type TheType = The<typeof TheType>;
        const TheType = object('TheType', { narrow: literal('value'), wide: string });

        type UnionOfObjects =
            | { narrow: number; wide: string } // not compatible because of narrow: number
            | { narrow: string; wide: 'sneaky narrow' } // compatible if narrow happens to be `'value'`
            | { something: 'else' }; // compatible if narrow and wide are present, we don't know.
        const obj = { narrow: 'value', wide: 'sneaky narrow' } as UnionOfObjects;
        if (TheType.is(obj)) {
            assignableTo<{ narrow: 'value'; wide: 'sneaky narrow' } | { something: 'else'; narrow: 'value'; wide: string }>(obj);
            assignableTo<typeof obj>({ narrow: 'value', wide: 'sneaky narrow' });
            assignableTo<typeof obj>({ something: 'else', narrow: 'value', wide: 'something else' });
        }

        const value = { narrow: 'value', wide: 'a literal' as const };
        if (TheType.is(value)) {
            assignableTo<{ narrow: 'value'; wide: 'a literal' }>(value);
            assignableTo<typeof value>({ narrow: 'value', wide: 'a literal' });
        }
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

            - at <a>: expected a string matching pattern /^\\d+$/, got: "abc"

            - at <b>: expected a whole number, got: 1.2"
        `);
    });
});
