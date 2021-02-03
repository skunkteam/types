import type { The } from '../interfaces';
import { assignableTo, defaultUsualSuspects, testTypeImpl, testTypes } from '../testutils';
import { boolean } from './boolean';
import { InterfaceType, object, partial } from './interface';
import { IntersectionType } from './intersection';
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
            { force: { prevent: 'too large error messages by truncating smartly and beautifully' } },
            'error in [{ force?: boolean }] at <force>: expected a boolean, got an object ({ prevent: "too large err .. d beautifully" })',
        ],
    ],
});

testTypeImpl({
    name: '{ really?: boolean.autoCast, amounts?: { begin: number.autoCast, end: number.autoCast } }',
    type: partial({ really: boolean, amounts: object({ begin: number, end: number }) }).autoCastAll,
    basicType: 'object',
    validValues: [{}, { really: true }, { really: false, amounts: { begin: 123, end: -456 } }, { amounts: { begin: 123, end: -456 } }],
    validConversions: [
        [{}, {}],
        [
            { really: 1, amounts: { begin: '123.456', end: BigInt(789) } },
            { really: true, amounts: { begin: 123.456, end: 789 } },
        ],
    ],
});

testTypeImpl({ name: 'CustomNamed.autoCastAll', type: object('CustomNamed', { prop: string }).autoCastAll });

const specialStringOrUndefined = string.or(undefinedType).withParser(i => i || '<empty>');
testTypeImpl({
    name: '{ presenceNotRequired: string | undefined }',
    type: object({ presenceNotRequired: specialStringOrUndefined }),
    basicType: 'object',
    validValues: [{ presenceNotRequired: undefined }, { presenceNotRequired: 'abc' }],
    validConversions: [[{}, { presenceNotRequired: '<empty>' }]],
});

testTypeImpl({
    name: '{ presenceRequired: string | undefined }',
    type: object({ strictMissingKeys: true }, { presenceRequired: specialStringOrUndefined }),
    validValues: [{ presenceRequired: undefined }, { presenceRequired: 'abc' }],
    invalidValues: [
        [{}, 'error in [{ presenceRequired: string | undefined }]: missing property <presenceRequired> [string | undefined], got: {}'],
    ],
    validConversions: [[{ presenceRequired: undefined }, { presenceRequired: '<empty>' }]],
});

testTypeImpl({
    name: '{ undefinedNotAllowed?: string, undefinedAllowed?: string | undefined }',
    type: object({ strictMissingKeys: true, partial: true }, { undefinedNotAllowed: string, undefinedAllowed: specialStringOrUndefined }),
    validValues: [{ undefinedNotAllowed: 'abc', undefinedAllowed: undefined }, {}],
    invalidValues: [
        [
            { undefinedNotAllowed: undefined, undefinedAllowed: undefined },
            'error in [{ undefinedNotAllowed?: string, undefinedAllowed?: string | undefined }] at <undefinedNotAllowed>: expected a string, got an undefined',
        ],
    ],
    validConversions: [
        [{}, {}],
        [{ undefinedAllowed: undefined }, { undefinedAllowed: '<empty>' }],
    ],
});

testTypeImpl({
    name: '{ undefinedAllowed?: string }',
    type: object({ partial: true }, { undefinedAllowed: string }),
    validValues: [{ undefinedAllowed: undefined }, {}],
    validConversions: [
        [{}, {}],
        [{ undefinedAllowed: undefined }, {}],
        [{ undefinedAllowed: 'abc' }, { undefinedAllowed: 'abc' }],
    ],
});

describe(object, () => {
    type MyType = The<typeof MyType>;
    const MyType = object({ s: string, n: number });

    test('access to keys', () => {
        const { keys, props, name, possibleDiscriminators } = MyType;
        expect(name).toBe('{ s: string, n: number }');
        expect(keys).toEqual(['s', 'n']);
        expect(props).toEqual({ s: string, n: number });
        expect(possibleDiscriminators).toEqual([]);
    });

    test.each`
        name                            | impl
        ${'{ a: number, b: string }'}   | ${object({ a: number, b: string })}
        ${'{ a?: number, b?: string }'} | ${partial({ a: number, b: string })}
        ${'{ a: number, b?: string }'}  | ${object({ a: number }).withOptional({ b: string })}
        ${'MyObject'}                   | ${object('MyObject', { a: number }).withOptional({ b: string })}
        ${'MyPartial'}                  | ${object('MyObject', { a: number }).withOptional('MyPartial', { b: string })}
    `('default name: $name', ({ impl, name }) => {
        expect(impl).toHaveProperty('name', name);
    });

    test(InterfaceType.prototype.withOptional.name, () => {
        const t = object({ a: number });
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
        assignableTo<ReadonlyArray<'s' | 'n'>>(keys);
        assignableTo<typeof keys>(['s', 'n']);
    });

    testTypes('not readonly by default', () => {
        const value: MyType = { n: 1, s: 's' };
        value.n = 4;
        value.s = 'str';
    });
});

describe('checkOnly', () => {
    type CheckOnlyType = The<typeof CheckOnlyType>;
    const CheckOnlyType = object({ name: 'CheckOnlyType', checkOnly: true }, { s: string, n: number });

    type RegularType = The<typeof RegularType>;
    const RegularType = object('RegularType', { s: string, n: number });

    const correctObj = { s: '2', n: 3 };
    const wrongObj = { s: 2, n: '3' };

    test('return the original object', () => {
        expect(CheckOnlyType(correctObj)).toBe(correctObj);

        expect(RegularType(correctObj)).not.toBe(correctObj);
        expect(RegularType(correctObj)).toEqual(correctObj);
    });

    test('not fail on extra properties', () => {
        const objWithExtraProps = { ...correctObj, foo: 'bar' };

        expect(CheckOnlyType(objWithExtraProps)).toBe(objWithExtraProps);

        expect(RegularType(objWithExtraProps)).not.toBe(objWithExtraProps);
        expect(RegularType(objWithExtraProps)).not.toEqual(objWithExtraProps);
        expect(RegularType(objWithExtraProps)).toEqual(correctObj);
    });

    test('fail if applicable', () => {
        expect(() => CheckOnlyType(wrongObj)).toThrow();
        expect(() => CheckOnlyType.autoCastAll(wrongObj)).toThrow();

        expect(() => RegularType(wrongObj)).toThrow();
        expect(RegularType.autoCastAll(wrongObj)).toEqual(correctObj);
    });
});
