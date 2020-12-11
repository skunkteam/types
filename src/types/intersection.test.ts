import { BaseTypeImpl } from '../base-type';
import type { The } from '../interfaces';
import { assignableTo, testTypes } from '../testutils';
import { array } from './array';
import { boolean } from './boolean';
import { object, partial } from './interface';
import { intersection, IntersectionOfTypeTuple } from './intersection';
import { literal } from './literal';
import { number } from './number';
import { union } from './union';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

describe(intersection, () => {
    test.each`
        name                                         | impl
        ${'{ a: "property", b: number }'}            | ${intersection([object({ a: literal('property'), b: number })])}
        ${'{ a: "property", b?: number }'}           | ${intersection([object({ a: literal('property') }), partial({ b: number })])}
        ${'{ a: "property", b?: number }'}           | ${object({ a: literal('property') }).and(partial({ b: number }))}
        ${'NamedObject & { a?: number, b: number }'} | ${intersection([partial({ a: number }), object('NamedObject', {}), object({ b: number })])}
        ${'{ a?: number, b: number }'}               | ${intersection([intersection([partial({ a: number })]), object({ b: number })])}
    `('default name: $name', ({ impl, name }) => {
        expect(impl).toHaveProperty('name', name);
        expect(impl.props).toEqual({
            a: expect.any(BaseTypeImpl),
            b: expect.any(BaseTypeImpl),
        });
    });

    test('complex name', () => {
        // type A = { tag: '{' };
        const A = object({ tag: literal('{') });
        // type B = { 'tag': '('; 'only-here': true };
        const B = object({ 'tag': literal('('), 'only-here': literal(true) });
        // type C = { tok?: number };
        const C = partial({ tok: number });
        // type U = (A | B) & C;
        type U = The<typeof U>;
        const U = intersection([union([A, B]), C]);

        expect(U.name).toBe('({ tag: "{" } | { tag: "(", "only-here": true }) & { tok?: number }');

        expect(U.combinedName).toBe('{ tag: "{" | "(", "only-here"?: true, tok?: number }');

        // Sanity checks:
        U.check({ tag: '{' });
        U.check({ tag: '{', tok: 123 });
        U.check({ 'tag': '(', 'only-here': true });
        U.check({ 'tag': '(', 'only-here': true, 'tok': 456 });

        expect(U.is({ tag: '{', tok: '123' })).toBeFalse();
        expect(U.is({ tag: '(' })).toBeFalse();
    });

    test('invalid type defs', () => {
        expect(() => intersection([array(number) as any, object({})])).toThrow('can only create an intersection of objects, got: number[]');
        jest.spyOn(console, 'warn').mockReturnValueOnce();
        intersection([object({ a: number }), object({ a: number })]);
        expect(console.warn).toHaveBeenCalledWith(
            'overlapping properties are currently not supported in intersections, overlapping properties: a',
        );
    });

    testTypes('correct intersection of types', () => {
        type Union = BaseTypeImpl<{ option: 'a' } | { option: 'b' }>;
        type Name = BaseTypeImpl<{ first: string; last: string }>;
        type ManualIntersection = ({ option: 'a' } | { option: 'b' }) & { first: string; last: string };
        type CalculatedIntersection = IntersectionOfTypeTuple<[Union, Name]>;

        assignableTo<CalculatedIntersection>({} as ManualIntersection);
        assignableTo<ManualIntersection>({} as CalculatedIntersection);
    });

    testTypes('resulting type and props', () => {
        type MyIntersection = The<typeof MyIntersection>;
        const MyIntersection = intersection([intersection([partial({ a: number })]), object({ b: number }), object({ c: boolean })]);

        assignableTo<MyIntersection>({ b: 1, c: false });
        assignableTo<MyIntersection>({ a: 1, b: 2, c: true });
        assignableTo<{ a?: number; b: number; c: boolean }>(MyIntersection({}));

        // @ts-expect-error d is unknown property
        assignableTo<MyIntersection>({ a: 1, b: 2, c: true, d: 0 });

        // @ts-expect-error a is optional in MyIntersection
        assignableTo<{ a: number }>(MyIntersection({}));

        const { props, propsInfo } = MyIntersection;
        assignableTo<{ a: typeof number; b: typeof number; c: typeof boolean }>(props);
        assignableTo<typeof props>({ a: number, b: number, c: boolean });
        assignableTo<{
            a: { partial: boolean; type: typeof number };
            b: { partial: boolean; type: typeof number };
            c: { partial: boolean; type: typeof boolean };
        }>(propsInfo);
        assignableTo<typeof propsInfo>({
            a: { partial: false, type: number },
            b: { partial: false, type: number },
            c: { partial: false, type: boolean },
        });
    });
});
