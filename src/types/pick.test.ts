import { The } from '../interfaces';
import { createExample, testTypeImpl } from '../testutils';
import { boolean } from './boolean';
import { object, partial } from './interface';
import { number } from './number';
import { pick, pickProperties, pickPropertiesInfo } from './pick';
import { string } from './string';
import './intersection';
import { intersection } from './intersection';
import { union } from './union.js';
import { literal } from './literal.js';
import { array } from './array.js';

type TestType = The<typeof TestType>;
const TestType = object('TestType', {
    a: string,
    b: boolean,
    c: number,
});

testTypeImpl({
    name: `Pick<TestType, 'b' | 'c'>`,
    type: pick(TestType, ['b', 'c']),
    basicType: 'object',
    validValues: [
        { b: true, c: 5 },
        { b: false, c: -2 },
    ],
    invalidValues: [
        [{ b: 'blah', c: 3 }, `error in [Pick<TestType, 'b' | 'c'>] at <b>: expected a boolean, got a string ("blah")`],
        [{ c: 3 }, `error in [Pick<TestType, 'b' | 'c'>]: missing property <b> [boolean], got: { c: 3 }`],
    ],
    validConversions: [
        [
            { a: 'drop', b: true, c: 2 },
            { b: true, c: 2 },
        ],
    ],
});

type PartialTestType = The<typeof PartialTestType>;
const PartialTestType = partial('PartialTestType', {
    d: string,
    e: number,
});
testTypeImpl({
    name: `Pick<PartialTestType, 'd'>`,
    type: pick(PartialTestType, ['d']),
    basicType: 'object',
    validValues: [{ d: 'blah' }, {}],
    invalidValues: [[{ d: undefined }, `error in [Pick<PartialTestType, 'd'>] at <d>: expected a string, got an undefined`]],
    validConversions: [
        [{ b: true, c: 3 }, {}],
        [{ d: 'hns', e: 1 }, { d: 'hns' }],
    ],
});

type IntersectionTestType = The<typeof IntersectionTestType>;
const IntersectionTestType = intersection('IntersectionTestType', [TestType, PartialTestType]);
testTypeImpl({
    name: `Pick<IntersectionTestType, 'a' | 'd'>`,
    type: pick(IntersectionTestType, ['a', 'd']),
    basicType: 'object',
    validValues: [{ a: 'blah', d: 'dah' }, { a: 'blah2' }, { a: 'hts', d: '' }],
    invalidValues: [
        [{ d: 'dah' }, `error in [Pick<IntersectionTestType, 'a' | 'd'>]: missing property <a> [string], got: { d: "dah" }`],
        [{ a: 'blah2', d: undefined }, `error in [Pick<IntersectionTestType, 'a' | 'd'>] at <d>: expected a string, got an undefined`],
    ],
    validConversions: [
        [
            { a: 'drop', b: true, c: 2, d: 'tnsh', e: 2 },
            { a: 'drop', d: 'tnsh' },
        ],
        [{ a: 'tns' }, { a: 'tns' }],
    ],
});

type Overlap = The<typeof Overlap>;
const Overlap = object('Overlap', {
    a: string,
    b: boolean,
    d: boolean,
});
type UnionTestType = The<typeof UnionTestType>;
const UnionTestType = union('UnionTestType', [TestType, Overlap]);
// const pickunion = pick(UnionTestType, ['a']);
testTypeImpl({
    name: `Pick<UnionTestType, 'a'>`,
    type: pick(UnionTestType, ['a']),
    basicType: 'object',
    validValues: [{ a: 'str' }, { a: '' }],
    invalidValues: [
        [{}, `error in [Pick<UnionTestType, 'a'>]: missing property <a> [string | string], got: {}`],
        [{ a: true }, `error in [Pick<UnionTestType, 'a'>] at <a>: expected a string, got a boolean (true)`],
    ],
    validConversions: [
        [{ a: 'Overlap', b: true }, { a: 'Overlap' }],
        [{ a: 'TestType', b: false, c: 12 }, { a: 'TestType' }],
    ],
});

type NastyType = The<typeof NastyType>;
const NastyType = object('NastyType', {
    union: UnionTestType,
    intersection: pick(IntersectionTestType, ['a', 'd']),
    inlineUnion: literal('stringliteral').or(literal(12)),
    nestedOptionals: object({
        req: string,
    }).withOptional({
        opt: string,
    }),
    arr: array(number).withConstraint('nonempty', i => i.length > 0),
}).withOptional({
    optionalUnion: pick(UnionTestType, ['a']).or(pick(IntersectionTestType, ['c', 'd'])),
    optionalIntersection: pick(IntersectionTestType, ['a', 'd']),
});
testTypeImpl({
    type: pick(NastyType, ['inlineUnion', 'optionalIntersection']),
    name: `Pick<NastyType, 'inlineUnion' | 'optionalIntersection'>`,
    basicType: 'object',
    validValues: [
        { inlineUnion: 'stringliteral', optionalIntersection: { a: 'reqstring', d: 'optionalstring' } },
        { inlineUnion: 12, optionalIntersection: { a: 'reqstring' } },
        { inlineUnion: 'stringliteral' },
    ],
    invalidValues: [
        [
            { inlineUnion: 13, optionalIntersection: { a: 'reqstring', d: 'optionalstring' } },
            [
                `error in [Pick<NastyType, 'inlineUnion' | 'optionalIntersection'>] at <inlineUnion>: in union element [12]: expected the literal 12, got: 13`,
                `  • disregarded 1 union-subtype that does not accept a number`,
            ],
        ],
        [
            { optionalIntersection: { a: 'reqstring', d: 'optionalstring' } },
            `error in [Pick<NastyType, 'inlineUnion' | 'optionalIntersection'>]: missing property <inlineUnion> ["stringliteral" | 12], got: { optionalIntersection: { a: "reqstring", d: " .. " } }`,
        ],
        [
            { inlineUnion: 12, optionalIntersection: { a: 'reqstring', d: undefined } },
            `error in [Pick<NastyType, 'inlineUnion' | 'optionalIntersection'>] at <optionalIntersection.d>: expected a string, got an undefined`,
        ],
        [
            { inlineUnion: 12, optionalIntersection: {} },
            `error in [Pick<NastyType, 'inlineUnion' | 'optionalIntersection'>] at <optionalIntersection>: missing property <a> [string], got: {}`,
        ],
    ],
});

const example1 = createExample(NastyType, 1);
const example2 = createExample(NastyType, 2);

testTypeImpl({
    type: pick(NastyType, ['optionalUnion', 'arr']),
    name: `Pick<NastyType, 'optionalUnion' | 'arr'>`,
    basicType: 'object',
    validValues: [
        { optionalUnion: { a: 'pickedUnion' }, arr: [1] },
        { optionalUnion: { c: 12, d: 'pickedIntersection' }, arr: [12, 3] },
        { optionalUnion: { c: 1 }, arr: [12, 3] },
        { arr: [12, 3] },
    ],
    invalidValues: [
        [
            { optionalUnion: 13, arr: [] },
            [
                `errors in [Pick<NastyType, 'optionalUnion' | 'arr'>]:`,
                `- at <optionalUnion>: expected an object, got a number (13)`,
                `- at <arr>: expected a [nonempty], got: []`,
            ],
        ],
        [
            { optionalUnion: { a: 'from UnionTestType', c: 'from IntersectionTestType', d: 'from IntersectionTestType' }, arr: [12] },
            `error`,
        ],
    ],
    validConversions: [[example1, { optionalUnion: example1.optionalUnion, arr: example1.arr }]],
});

describe('Other', () => {
    test('narrowing', () => {
        expect(pick(NastyType, ['optionalUnion', 'arr'])(example1)).toEqual({
            optionalUnion: {
                a: 'xxxxxxxxxxxxxxxx',
            },
            arr: example1.arr,
        });
        expect(pick(NastyType, ['optionalUnion', 'arr'])(example2)).toEqual({
            optionalUnion: {
                c: 0.14,
                d: 'xxxxxxxxxxxxxxx',
            },
            arr: example2.arr,
        });
    });
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
