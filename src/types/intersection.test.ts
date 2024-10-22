import { expectTypeOf } from 'expect-type';
import { autoCastAll } from '../autocast';
import { BaseTypeImpl } from '../base-type';
import type { The } from '../interfaces';
import { testTypeImpl } from '../testutils';
import { boolean } from './boolean';
import { object, partial } from './interface';
import { IntersectionOfTypeTuple, intersection } from './intersection';
import { literal } from './literal';
import { number } from './number';
import { string } from './string';
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
        ${'NamedObjectA & NamedObjectB'}             | ${intersection([object('NamedObjectA', { a: number }), object('NamedObjectB', { b: number })])}
    `('default name: $name', ({ impl, name }) => {
        expect(impl).toHaveProperty('name', name);
        expect(impl.props).toEqual({
            a: expect.any(BaseTypeImpl),
            b: expect.any(BaseTypeImpl),
        });
    });

    testTypeImpl({
        name: 'AutoCastAll<NamedObject> & { true: AutoCast<true> }',
        // stupid type, I know
        type: autoCastAll(intersection([object('NamedObject', { obj: literal('[object Object]') }), object({ true: literal(true) })])),
        basicType: 'object',
        validConversions: [
            [
                { obj: {}, true: 1 },
                { obj: '[object Object]', true: true },
            ],
        ],
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

    test('possibleDiscriminators', () => {
        type IntersectionOfUnions = The<typeof IntersectionOfUnions>;
        const IntersectionOfUnions = intersection('IntersectionOfUnions', [
            union('left', [object({ leftProp: literal('a') }), object({ leftProp: literal('b') })]),
            union('right', [object({ rightProp: literal('c') }), object({ rightProp: literal('d') })]),
        ]);

        expect(IntersectionOfUnions.possibleDiscriminators).toEqual([
            { path: ['leftProp'], values: ['a', 'b'] },
            { path: ['rightProp'], values: ['c', 'd'] },
        ]);
    });

    test('invalid type defs', () => {
        jest.spyOn(console, 'warn').mockReturnValueOnce();
        intersection([object({ a: number }), object({ a: number })]);
        expect(console.warn).not.toHaveBeenCalled();
        intersection([object({ a: number }), object({ a: string })]);
        expect(console.warn).toHaveBeenCalledWith(
            'overlapping properties are currently not supported in intersections, overlapping properties: a',
        );
    });

    test('correct intersection of types', () => {
        type Union = BaseTypeImpl<{ option: 'a' } | { option: 'b' }>;
        type Name = BaseTypeImpl<{ first: string; last: string }>;
        type ManualIntersection = ({ option: 'a' } | { option: 'b' }) & { first: string; last: string };
        type CalculatedIntersection = IntersectionOfTypeTuple<[Union, Name]>;

        expectTypeOf<CalculatedIntersection>().branded.toEqualTypeOf<ManualIntersection>();
    });

    test('mixed "and" and "or"', () => {
        type InnerType = The<typeof InnerType>;
        const InnerType = object('InnerType', { innerProp: boolean });

        type TaggedUnionWithAndAndOr = The<typeof TaggedUnionWithAndAndOr>;
        const TaggedUnionWithAndAndOr = object({ type: literal('and') })
            .and(InnerType)
            .or(object({ type: literal('nested'), nested: InnerType }));

        expectTypeOf<TaggedUnionWithAndAndOr>().toEqualTypeOf<
            { type: 'and'; innerProp: boolean } | { type: 'nested'; nested: { innerProp: boolean } }
        >();
    });

    test('resulting type and props', () => {
        type MyIntersection = The<typeof MyIntersection>;
        const MyIntersection = intersection([intersection([partial({ a: number })]), object({ b: number }), object({ c: boolean })]);

        expectTypeOf<MyIntersection>().toEqualTypeOf<{ a?: number; b: number; c: boolean }>();

        expectTypeOf(MyIntersection).toHaveProperty('props').toEqualTypeOf<{ a: typeof number; b: typeof number; c: typeof boolean }>();
        expectTypeOf(MyIntersection).toHaveProperty('propsInfo').toEqualTypeOf<{
            a: { optional: boolean; type: typeof number };
            b: { optional: boolean; type: typeof number };
            c: { optional: boolean; type: typeof boolean };
        }>();
    });
});
