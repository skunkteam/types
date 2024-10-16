import { The } from '../interfaces';
import { assignableTo, testTypeImpl } from '../testutils';
import { checkOneOrMore } from '../utils';
import { array } from './array';
import { boolean } from './boolean';
import { object, partial } from './interface';
import { intersection } from './intersection';
import { literal } from './literal';
import { number } from './number';
import { narrowPickedKeys, pick, validPick } from './pick';
import { string } from './string';
import { union } from './union';

type A = The<typeof A>;
const A = object('A', {
    a: string,
    b: boolean,
    c: number,
});
testTypeImpl({
    type: pick('MyCustomName', A, ['a', 'b']),
    name: 'MyCustomName',
});
testTypeImpl({
    type: pick(A, ['b', 'c']),
    name: `Pick<A, 'b' | 'c'>`,
    basicType: 'object',
    validValues: [
        { b: true, c: 5 },
        { b: false, c: -2 },
    ],
    invalidValues: [
        [{ b: 'hi', c: 3 }, `error in [Pick<A, 'b' | 'c'>] at <b>: expected a boolean, got a string ("hi")`],
        [{ c: 3 }, `error in [Pick<A, 'b' | 'c'>]: missing property <b> [boolean], got: { c: 3 }`],
    ],
    validConversions: [
        [
            { a: 42, b: true, c: 2 }, // `a` is actually of the wrong type, but that shouldn't matter.
            { b: true, c: 2 },
        ],
    ],
});

/** No overlap in property names with `A`. */
type B = The<typeof B>;
const B = partial('B', {
    d: string,
    e: number,
});
testTypeImpl({
    name: `Pick<B, 'd'>`,
    type: pick(B, ['d']),
    basicType: 'object',
    validValues: [{ d: 'string' }, {}],
    invalidValues: [[{ d: undefined }, `error in [Pick<B, 'd'>] at <d>: expected a string, got an undefined`]],
    validConversions: [
        [{ b: true, c: 3 }, {}], // Property `b` and `c` don't even exist on `B`.
        [{ d: 'string value', e: 'no validation here' }, { d: 'string value' }],
    ],
});

type IntersectAB = The<typeof IntersectAB>;
const IntersectAB = intersection('IntersectAB', [A, B]);
testTypeImpl({
    name: `Pick<IntersectAB, 'a' | 'd'>`,
    type: pick(IntersectAB, ['a', 'd']),
    basicType: 'object',
    validValues: [{ a: 'string a', d: 'string d' }, { a: 'string a' }, { a: 'string a', d: '' }],
    invalidValues: [
        [{ d: 'string d' }, `error in [Pick<IntersectAB, 'a' | 'd'>]: missing property <a> [string], got: { d: "string d" }`],
        [{ a: 'string a', d: undefined }, `error in [Pick<IntersectAB, 'a' | 'd'>] at <d>: expected a string, got an undefined`],
    ],
    validConversions: [
        [
            { a: 'string a', b: 'not a bool', c: 2, d: 'string d', e: false },
            { a: 'string a', d: 'string d' },
        ],
    ],
});

/** Property `a` and `b` overlapping in name and type with A, but `d` doesn't exist in A. */
type C = The<typeof C>;
const C = object('C', {
    a: string,
    b: number,
    d: boolean,
});
type PickedUnionAC = The<typeof PickedUnionAC>;
const PickedUnionAC = pick(union('UnionAC', [A, C]), ['a', 'd']);
testTypeImpl({
    name: `Pick<UnionAC, 'a' | 'd'>`,
    type: PickedUnionAC,
    basicType: 'object',
    validValues: [{ a: 'string a', d: true }, { a: 'string a' }],
    invalidValues: [
        [
            { d: true },
            [
                `error in [Pick<UnionAC, 'a' | 'd'>]: failed every element in union:`,
                `(got: { d: true })`,
                `  • error in [Pick<C, 'a' | 'd'>]: missing property <a> [string]`,
                `  • error in [Pick<A, 'a'>]: missing property <a> [string]`,
            ],
        ],
    ],
    validConversions: [
        [{ a: 'string a', b: true }, { a: 'string a' }],
        [
            { a: 'string a2', d: true, c: undefined },
            { a: 'string a2', d: true },
        ],
    ],
});
assignableTo<PickedUnionAC>({ a: 'string' });
assignableTo<PickedUnionAC>({ a: 'string', d: true });
// @ts-expect-error because no union element accepts just { d: boolean }
assignableTo<PickedUnionAC>({ d: true });

/**  { a: string; b: boolean; }
 * | { a: string; b: number; }
 * | { a: number; b: string; } */
type DiscriminatedUnion = The<typeof DiscriminatedUnion>;
const DiscriminatedUnion = pick('DiscriminatedUnion', A.or(C).or(object({ a: number, b: string, c: number })), ['a', 'b']);
testTypeImpl({
    name: `DiscriminatedUnion`,
    type: DiscriminatedUnion,
    basicType: 'object',
    validValues: [
        { a: 'string', b: true },
        { a: 'string', b: 2 },
        { a: 3, b: 'string' },
    ],
    invalidConversions: [
        [
            { a: 'string 1', b: 'string 2', c: null },
            [
                `error in [DiscriminatedUnion]: failed every element in union:`,
                `(got: { a: "string 1", b: "string 2", c: null })`,
                `  • error in [Pick<A | C, 'a' | 'b'>] at <b>: expected a boolean or a number, got a string ("string 2")`,
                `  • error in [Pick<{ a: number, b: string, c: number }, 'a' | 'b'>] at <a>: expected a number, got a string ("string 1")`,
            ],
        ],
    ],
});
assignableTo<DiscriminatedUnion>({ a: 'string', b: true });
assignableTo<DiscriminatedUnion>({ a: 'string', b: 3 });
assignableTo<DiscriminatedUnion>({ a: 3, b: 'true' });
// @ts-expect-error because no union element accepts string, string
assignableTo<DiscriminatedUnion>({ a: 'string', b: 'true' });
// @ts-expect-error because no union element accepts number, bool
assignableTo<DiscriminatedUnion>({ a: 3, b: true });
// @ts-expect-error because no union element accepts number, number
assignableTo<DiscriminatedUnion>({ a: 3, b: 3 });

// { a: 'string' } | { b: true }, picking 'b' => { b: true } is the only valid variant for the picked key.
type PickUniqueVariantProp = The<typeof PickUniqueVariantProp>;
const PickUniqueVariantProp = pick(object({ a: literal('string') }).or(object({ b: literal(true) })), ['b']);
testTypeImpl({
    name: `Pick<{ a: "string" } | { b: true }, 'b'>`,
    type: PickUniqueVariantProp,
    basicType: 'object',
    validValues: [{ b: true }],
    validConversions: [[{ a: 'string', b: true, c: null }, { b: true }]],
});

describe('Other', () => {
    test('Invalid basic types for input', () => {
        // When parsing input on a valid pick type
        expect(() => DiscriminatedUnion(1)).toThrow('error in [DiscriminatedUnion]: expected an object, got a number');
        // When constructing a new pick type from a union
        expect(() => pick(array(A).or(B), ['d'])).toThrow(`Can only pick elements of unions with 'object' as basic type.`);
    });
    describe('Union variant validation helper functions', () => {
        const types = checkOneOrMore([
            object({ a: literal('a'), b: literal('b'), c: literal('c') }),
            object({ b: literal('b'), c: literal('c'), d: literal('d') }),
            object({ c: literal('c'), d: literal('d'), e: literal('e') }),
        ]);
        test.each`
            pickedKeys    | narrowedKeys                       | isValidPick
            ${['a']}      | ${[['a'], [], []]}                 | ${true}
            ${['b']}      | ${[['b'], ['b'], []]}              | ${true}
            ${['c']}      | ${[['c'], ['c'], ['c']]}           | ${true}
            ${['a', 'b']} | ${[['a', 'b'], ['b'], []]}         | ${true}
            ${['c', 'd']} | ${[['c'], ['c', 'd'], ['c', 'd']]} | ${true}
            ${['a', 'd']} | ${[['a'], ['d'], ['d']]}           | ${false}
            ${['a', 'e']} | ${[['a'], [], ['e']]}              | ${false}
        `('Picking $pickedKeys should be valid: $isValidPick', ({ pickedKeys, narrowedKeys, isValidPick }) => {
            expect(narrowPickedKeys(pickedKeys, types)).toEqual(narrowedKeys);
            expect(validPick(pickedKeys, narrowedKeys)).toBe(isValidPick);
        });
        test('Impossible union variant pick construction should throw', () => {
            expect(() => pick('Unpickable', union(types), ['a', 'd'])).toThrow('Selected keys describe impossible union variant.');
        });
    });
});
