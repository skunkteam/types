import { testTypeImpl } from '../testutils';
import { boolean } from './boolean';
import { object } from './interface';
import { literal, nullType, undefinedType } from './literal';
import { number } from './number';
import { string } from './string';
import { union } from './union';

testTypeImpl({
    name: 'number | null',
    type: number.or(nullType),
    basicType: 'mixed',
    validValues: [123, null],
    invalidValues: [
        ['a string', 'error in [number | null]: expected a null or a number, got a string ("a string")'],
        [
            NaN,
            [
                'error in [number | null]: in union element [number]: expected a [number], got: NaN',
                '  • disregarded 1 union-subtype that does not accept a number',
            ],
        ],
    ],
});

const StrangeNumberUnion = union('StrangeNumberUnion', [
    number.withConstraint('LessThanMinus10', n => n < -10),
    literal(0),
    number.withValidation(n => n > 10),
]);

// No autoCast feature
expect(StrangeNumberUnion.autoCast).toBe(StrangeNumberUnion);

testTypeImpl({
    name: 'StrangeNumberUnion.autoCastAll',
    type: StrangeNumberUnion.autoCastAll,
    validValues: [-11, 0, 11],
    invalidValues: [
        [
            3,
            [
                'error in [StrangeNumberUnion.autoCastAll]: failed every element in union:',
                '  • expected a [LessThanMinus10], got: 3',
                '  • expected the literal 0, got: 3',
                '  • error in [number]: additional validation failed',
            ],
        ],
    ],
    validConversions: [
        ['-15', -15],
        ['15', 15],
    ],
    invalidConversions: [
        [
            '-5',
            [
                'error in [StrangeNumberUnion.autoCastAll]: failed every element in union:',
                '  • expected a [LessThanMinus10], got: -5, parsed from: "-5"',
                '  • expected the literal 0, got: -5, parsed from: "-5"',
                '  • error in [number]: additional validation failed',
            ],
        ],
    ],
});

const ObjectUnion = union([object({ tag: literal('a'), a: string }), object({ tag: literal('b'), b: number.autoCast })]);
testTypeImpl({ name: '{ tag: "a", a: string } | { tag: "b", b: number.autoCast }', type: ObjectUnion });
testTypeImpl({
    name: 'ObjectUnion',
    type: ObjectUnion.withName('ObjectUnion'),
    basicType: 'object',
    validValues: [
        { tag: 'a', a: 'str' },
        { tag: 'b', b: 123 },
    ],
    invalidValues: [
        [123, 'error in [ObjectUnion]: expected an object, got a number (123)'],
        [
            { tag: 'c' },
            [
                'error in [ObjectUnion]: every subtype of union has at least one discriminator mismatch',
                '  • [{ tag: "a", a: string }] requires <tag> to be "a", got: "c"',
                '  • [{ tag: "b", b: number.autoCast }] requires <tag> to be "b", got: "c"',
            ],
        ],
        [
            { tag: 'a' },
            [
                'error in [ObjectUnion]: in union element [{ tag: "a", a: string }]: missing property <a> [string], got: { tag: "a" }',
                '  • disregarded 1 union-subtype due to a mismatch in values of discriminator <tag>',
            ],
        ],
    ],
    validConversions: [
        [
            { tag: 'b', b: '123' },
            { tag: 'b', b: 123 },
        ],
    ],
});

const NetworkState = union('NetworkState', [
    object('NetworkLoadingState', { state: literal('loading') }),
    object('NetworkFailedState', { state: literal('failed'), code: number }),
    object('NetworkSuccessState', { state: literal('success'), response: object('Response', {}) }),
]);
testTypeImpl({
    name: 'NetworkState',
    type: NetworkState,
    basicType: 'object',
    validValues: [{ state: 'loading' }, { state: 'failed', code: 500 }, { state: 'success', response: {} }],
    invalidValues: [
        [
            {},
            [
                'error in [NetworkState]: failed every element in union:',
                '  • error in [NetworkLoadingState]: missing property <state> ["loading"], got: {}',
                '  • encountered multiple errors in [NetworkFailedState]:',
                '    ‣ missing properties <state> ["failed"], <code> [number], got: {}',
                '  • encountered multiple errors in [NetworkSuccessState]:',
                '    ‣ missing properties <state> ["success"], <response> [Response], got: {}',
            ],
        ],
        [
            { state: 'failed' },
            [
                'error in [NetworkState]: in union element [NetworkFailedState]: missing property <code> [number], got: { state: "failed" }',
                '  • disregarded 2 union-subtypes due to a mismatch in values of discriminator <state>',
            ],
        ],
    ],
});

const PrimitiveTypeUnion = union([number, string, boolean, undefinedType]);
testTypeImpl({ name: 'number | string | boolean | undefined', type: PrimitiveTypeUnion });
testTypeImpl({
    name: 'PrimitiveTypeUnion',
    type: PrimitiveTypeUnion.withName('PrimitiveTypeUnion'),
    basicType: 'mixed',
    validValues: ['a string', 123, true, false],
    invalidValues: [
        [{}, 'error in [PrimitiveTypeUnion]: expected a boolean, a number, a string or an undefined, got an object ({})'],
        [null, 'error in [PrimitiveTypeUnion]: expected a boolean, a number, a string or an undefined, got a null'],
    ],
});

const StringLiteralUnion = union([literal('abc'), literal('def')]);
testTypeImpl({ name: '"abc" | "def"', type: StringLiteralUnion });
testTypeImpl({
    name: 'StringLiteralUnion',
    type: StringLiteralUnion.withName('StringLiteralUnion'),
    basicType: 'string',
    validValues: ['abc', 'def'],
    invalidValues: [
        [{}, 'error in [StringLiteralUnion]: expected a string, got an object ({})'],
        [true, 'error in [StringLiteralUnion]: expected a string, got a boolean (true)'],
        // TODO:
    ],
});

const MixedLiteralUnion = union([literal('string'), literal(123), nullType, undefinedType, literal(false)]);
testTypeImpl({ name: '"string" | 123 | null | undefined | false', type: MixedLiteralUnion });
testTypeImpl({
    name: 'MixedLiteralUnion',
    type: MixedLiteralUnion.withName('MixedLiteralUnion'),
    basicType: 'mixed',
    validValues: ['string', 123, null, undefined, false],
    invalidValues: [
        [{}, 'error in [MixedLiteralUnion]: expected a boolean, a null, a number, a string or an undefined, got an object ({})'],
        [
            true,
            [
                'error in [MixedLiteralUnion]: in union element [false]: expected the literal false, got: true',
                '  • disregarded 4 union-subtypes that do not accept a boolean',
            ],
        ],
        [
            'other string',
            [
                'error in [MixedLiteralUnion]: in union element ["string"]: expected the literal "string", got: "other string"',
                '  • disregarded 4 union-subtypes that do not accept a string',
            ],
        ],
        [
            1234,
            [
                'error in [MixedLiteralUnion]: in union element [123]: expected the literal 123, got: 1234',
                '  • disregarded 4 union-subtypes that do not accept a number',
            ],
        ],
    ],
});

const CombinedMultiLiterals = union('CombinedMultiLiterals', [
    StringLiteralUnion.withName('StringLiteralUnion'),
    literal(123),
    literal(456),
    literal(false),
]);
testTypeImpl({
    name: 'CombinedMultiLiterals',
    type: CombinedMultiLiterals,
    basicType: 'mixed',
    validValues: ['abc', 'def', 123, 456, false],
    invalidValues: [
        [null, 'error in [CombinedMultiLiterals]: expected a boolean, a number or a string, got a null'],
        [
            true,
            [
                'error in [CombinedMultiLiterals]: in union element [false]: expected the literal false, got: true',
                '  • disregarded 4 union-subtypes that do not accept a boolean',
            ],
        ],
        [
            789,
            [
                'error in [CombinedMultiLiterals]: in subset of union: expected one of the literals 123 or 456, got: 789',
                '  • disregarded 3 union-subtypes that do not accept a number',
            ],
        ],
        [
            'ghi',
            [
                'error in [CombinedMultiLiterals]: in subset of union: expected one of the literals "abc" or "def", got: "ghi"',
                '  • disregarded 3 union-subtypes that do not accept a string',
            ],
        ],
    ],
});

testTypeImpl({
    name: 'NestedCombinedMultiLiterals',
    type: object('NestedCombinedMultiLiterals', { nested: CombinedMultiLiterals, c: string }),
    basicType: 'object',
    validValues: [
        { nested: 'abc', c: 'required' },
        { nested: 'def', c: 'required' },
        { nested: 123, c: 'required' },
        { nested: 456, c: 'required' },
        { nested: false, c: 'required' },
    ],
    invalidValues: [
        [
            { nested: {} },
            [
                'encountered multiple errors in [NestedCombinedMultiLiterals]:',
                '',
                '- missing property <c> [string], got: { nested: {} }',
                '',
                '- at <nested>: expected a boolean, a number or a string, got an object ({})',
            ],
        ],
        [
            { nested: true },
            [
                'encountered multiple errors in [NestedCombinedMultiLiterals]:',
                '',
                '- missing property <c> [string], got: { nested: true }',
                '',
                '- at <nested>: in union element [false]: expected the literal false, got: true',
                '  • disregarded 4 union-subtypes that do not accept a boolean',
            ],
        ],
        [
            { nested: 789 },
            [
                'encountered multiple errors in [NestedCombinedMultiLiterals]:',
                '',
                '- missing property <c> [string], got: { nested: 789 }',
                '',
                '- at <nested>: in subset of union: expected one of the literals 123 or 456, got: 789',
                '  • disregarded 3 union-subtypes that do not accept a number',
            ],
        ],
    ],
});

const MixedUnion = union([ObjectUnion, StringLiteralUnion]);
testTypeImpl({ name: '{ tag: "a", a: string } | { tag: "b", b: number.autoCast } | "abc" | "def"', type: MixedUnion });
testTypeImpl({ name: 'MixedUnion', type: MixedUnion.withName('MixedUnion'), basicType: 'mixed' });
