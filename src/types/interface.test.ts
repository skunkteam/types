import type { The } from '../interfaces';
import { assignableTo, defaultUsualSuspects, testTypeImpl, testTypes } from '../testutils';
import { boolean } from './boolean';
import { InterfaceType, partial, type } from './interface';
import { intersection, IntersectionType } from './intersection';
import { undefinedType } from './literal';
import { number } from './number';
import { string } from './string';

testTypeImpl({
    name: '{ force?: boolean }',
    type: partial({ force: boolean }),
    basicType: 'object',
    validValues: [{ force: true }, { force: true, otherOpts: 'also valid' }, {}],
    invalidValues: [
        ...defaultUsualSuspects(partial({ force: boolean })),
        [{ force: 'field' }, 'error in [{ force?: boolean }] at <force>: expected a boolean, got a string ("field")'],
        [
            { force: { TODO: 'prevent too large error messages' } },
            'error in [{ force?: boolean }] at <force>: expected a boolean, got an object ({ TODO: "prevent too large error messages" })',
        ],
    ],
});

const specialStringOrUndefined = string.or(undefinedType).withParser(i => (i ? String(i) : '<empty>'));
testTypeImpl({
    name: '{ presenceNotRequired: string | undefined, presenceRequired: string | undefined }',
    type: intersection([
        type({ presenceNotRequired: specialStringOrUndefined }),
        type({ treatMissingAsUndefined: false }, { presenceRequired: specialStringOrUndefined }),
    ]),
    basicType: 'object',
    validValues: [
        { presenceRequired: undefined },
        { presenceRequired: 'abc' },
        { presenceNotRequired: undefined, presenceRequired: undefined },
        { presenceNotRequired: 'abc', presenceRequired: 'abc' },
        { presenceNotRequired: 'abc', presenceRequired: undefined },
    ],
    invalidValues: [
        [
            {},
            'error in [{ presenceNotRequired: string | undefined, presenceRequired: string | undefined }]: missing property <presenceRequired> [string | undefined], got: {}',
        ],
    ],
    validConversions: [[{ presenceRequired: undefined }, { presenceNotRequired: '<empty>', presenceRequired: '<empty>' }]],
});

describe(type, () => {
    type MyType = The<typeof MyType>;
    const MyType = type({ s: string, n: number });

    test('access to keys', () => {
        const { keys, props, name, possibleDiscriminators } = MyType;
        expect(name).toBe('{ s: string, n: number }');
        expect(keys).toEqual(['s', 'n']);
        expect(props).toEqual({ s: string, n: number });
        expect(possibleDiscriminators).toEqual([]);
    });

    test.each`
        name                            | impl
        ${'{ a: number, b: string }'}   | ${type({ a: number, b: string })}
        ${'{ a?: number, b?: string }'} | ${partial({ a: number, b: string })}
        ${'{ a: number, b?: string }'}  | ${type({ a: number }).withOptional({ b: string })}
        ${'MyObject'}                   | ${type('MyObject', { a: number }).withOptional({ b: string })}
        ${'MyPartial'}                  | ${type('MyObject', { a: number }).withOptional('MyPartial', { b: string })}
    `('default name: $name', ({ impl, name }) => {
        expect(impl).toHaveProperty('name', name);
    });

    test(InterfaceType.prototype.withOptional.name, () => {
        const t = type({ a: number });
        const partialProps = { b: string };
        const result = t.withOptional(partialProps);
        expect(result).toBeInstanceOf(IntersectionType);
        expect(result.types).toHaveLength(2);
        expect(result.types[0]).toBe(t);
        expect(result.types[1].options.partial).toBeTrue();
        expect(result.types[1].props).toBe(partialProps);
    });

    testTypes('type of keys and props', () => {
        const { keys, props, propsInfo } = MyType;
        assignableTo<{ s: typeof string; n: typeof number }>(props);
        assignableTo<{ s: { partial: boolean; type: typeof string }; n: { partial: boolean; type: typeof number } }>(propsInfo);
        assignableTo<typeof props>({ n: number, s: string });
        assignableTo<Array<'s' | 'n'>>(keys);
        assignableTo<typeof keys>(['s', 'n']);
    });

    testTypes('not readonly by default', () => {
        const value: MyType = { n: 1, s: 's' };
        value.n = 4;
        value.s = 'str';
    });
});
