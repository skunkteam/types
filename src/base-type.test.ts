import assert from 'assert';
import { expectTypeOf } from 'expect-type';
import { BaseTypeImpl } from './base-type';
import type { The } from './interfaces';
import { boolean, int, literal, number, object, pattern, string, undefinedType, unknownRecord } from './types';

describe(BaseTypeImpl, () => {
    test.each(['a string', 123, false, { key: 'value' }] as const)('guard value: %p', value => {
        if (string.is(value)) {
            expectTypeOf(value).toEqualTypeOf<'a string'>();
            expect(value).toBe('a string');
        }
        if (number.is(value)) {
            expectTypeOf(value).toEqualTypeOf<123>();
            expect(value).toBe(123);
        }
        if (boolean.is(value)) {
            expectTypeOf(value).toEqualTypeOf<false>();
            expect(value).toBe(false);
        }
        if (unknownRecord.is(value)) {
            expectTypeOf(value).toEqualTypeOf<{ readonly key: 'value' }>();
            expect(value).toEqual({ key: 'value' });
        }

        const array = [value, value];
        if (array.every(string.is)) {
            expectTypeOf(array).toEqualTypeOf<'a string'[]>();
            expect(array).toEqual(['a string', 'a string']);
        } else if (array.every(number.is)) {
            expectTypeOf(array).toEqualTypeOf<123[]>();
            expect(array).toEqual([123, 123]);
        } else if (array.every(boolean.is)) {
            expectTypeOf(array).toEqualTypeOf<false[]>();
            expect(array).toEqual([false, false]);
        } else if (array.every(unknownRecord.is)) {
            expectTypeOf(array).toEqualTypeOf<{ readonly key: 'value' }[]>();
            expect(array).toEqual([{ key: 'value' }, { key: 'value' }]);
        } else {
            assert.fail('should have matched one of the other predicates');
        }

        () => {
            string.assert(value);
            expectTypeOf(value).toEqualTypeOf<'a string'>();
        };

        () => {
            number.assert(value);
            expectTypeOf(value).toEqualTypeOf<123>();
        };

        () => {
            boolean.assert(value);
            expectTypeOf(value).toEqualTypeOf<false>();
        };

        () => {
            unknownRecord.assert(value);
            expectTypeOf(value).toEqualTypeOf<{ readonly key: 'value' }>();
        };
    });

    test('guard value: unknown', () => {
        const value = undefined as unknown;
        expectTypeOf(value).toBeUnknown();
        if (string.is(value)) {
            expectTypeOf(value).toEqualTypeOf<string>();
        }
        if (number.is(value)) {
            expectTypeOf(value).toEqualTypeOf<number>();
        }
        if (boolean.is(value)) {
            expectTypeOf(value).toEqualTypeOf<boolean>();
        }
        if (unknownRecord.is(value)) {
            expectTypeOf(value).toEqualTypeOf<unknownRecord>();
        }
        expect(undefinedType.is(value)).toBeTrue();
        if (undefinedType.is(value)) {
            expectTypeOf(value).toEqualTypeOf<undefined>();
        }

        const array = [value, value];
        if (array.every(string.is)) {
            expectTypeOf(array).toEqualTypeOf<string[]>();
        } else if (array.every(number.is)) {
            expectTypeOf(array).toEqualTypeOf<number[]>();
        } else if (array.every(boolean.is)) {
            expectTypeOf(array).toEqualTypeOf<boolean[]>();
        } else if (array.every(unknownRecord.is)) {
            expectTypeOf(array).toEqualTypeOf<unknownRecord[]>();
        } else if (array.every(undefinedType.is)) {
            expectTypeOf(array).toEqualTypeOf<undefined[]>();
        } else {
            assert.fail('should have matched the last predicate');
        }

        () => {
            const value = undefined as unknown;
            string.assert(value);
            expectTypeOf(value).toEqualTypeOf<string>();
        };

        () => {
            const value = undefined as unknown;
            number.assert(value);
            expectTypeOf(value).toEqualTypeOf<number>();
        };

        () => {
            const value = undefined as unknown;
            boolean.assert(value);
            expectTypeOf(value).toEqualTypeOf<boolean>();
        };

        () => {
            const value = undefined as unknown;
            unknownRecord.assert(value);
            expectTypeOf(value).toEqualTypeOf<unknownRecord>();
        };
    });

    test('guard objects', () => {
        type TheType = The<typeof TheType>;
        const TheType = object('TheType', { narrow: literal('value'), wide: string });

        type UnionOfObjects =
            | { narrow: number; wide: string } // not compatible because of narrow: number
            | { narrow: string; wide: 'sneaky narrow' } // compatible if narrow happens to be `'value'`
            | { something: 'else' }; // compatible if narrow and wide are present, we don't know.
        const obj = { narrow: 'value', wide: 'sneaky narrow' } as UnionOfObjects;
        expectTypeOf(obj).toEqualTypeOf<UnionOfObjects>();
        if (TheType.is(obj)) {
            expectTypeOf(obj).branded.toEqualTypeOf<
                { narrow: 'value'; wide: 'sneaky narrow' } | { something: 'else'; narrow: 'value'; wide: string }
            >();
        }

        const value = { narrow: 'value', wide: 'a literal' as const };
        if (TheType.is(value)) {
            expectTypeOf(value).branded.toEqualTypeOf<{ narrow: 'value'; wide: 'a literal' }>();
        }
    });

    test('#literal', () => {
        type NumericString = The<typeof NumericString>;
        const NumericString = pattern('NumericString', /^\d+$/);

        type Obj = The<typeof Obj>;
        const Obj = object('Obj', { a: NumericString, b: int }).withParser(
            unknownRecord.andThen(r => {
                // Trim the contents of `a` to demo that parsers are still run with `.literal`.
                if ('a' in r && typeof r.a === 'string') {
                    return { ...r, a: r.a.trim() };
                }
                return r;
            }),
        );

        expectTypeOf({ a: NumericString('123'), b: int(123) }).toMatchTypeOf<Obj>();
        expectTypeOf({ a: '123', b: 123 }).not.toMatchTypeOf<Obj>(); // because values are not checked

        expect(Obj.literal({ a: '123', b: 123 })).toEqual({ a: '123', b: 123 });

        // Parsers are still run
        expect(Obj.literal({ a: '   123    ', b: 123 })).toEqual({ a: '123', b: 123 });

        expectTypeOf(Obj.literal({ a: '123', b: 123 })).toEqualTypeOf<Obj>();

        expect(() => Obj.literal({ a: 'abc', b: 1.2 })).toThrowErrorMatchingInlineSnapshot(`
            "errors in [Obj]:
            (got: { a: "abc", b: 1.2 })

            - at <a>: expected a string matching pattern /^\\d+$/, got: "abc"

            - at <b>: expected a whole number, got: 1.2"
        `);

        expect(() => Obj.literal({ a: '    abc    ', b: 1 })).toThrowErrorMatchingInlineSnapshot(`
            "errors in [Obj]:
            (got: { a: "abc", b: 1 }, parsed from: { a: "    abc    ", b: 1 })

            - at <a>: expected a string matching pattern /^\\d+$/, got: "abc""
        `);
    });
});
