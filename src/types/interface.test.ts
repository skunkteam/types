import type { The } from '../interfaces';
import { assignableTo, defaultUsualSuspects, stripped, testTypeImpl, testTypes } from '../testutils';
import { boolean } from './boolean';
import { InterfaceType, object, partial } from './interface';
import { undefinedType } from './literal';
import { number } from './number';
import { string } from './string';
import './union';
import { unknownRecord } from './unknown';

testTypeImpl({
    name: '{ force?: boolean }',
    type: partial({ force: boolean }),
    basicType: 'object',
    validValues: [{ force: true }, { force: true, otherOpts: 'also valid', [stripped]: { force: true } }, {}],
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
        ${'{ a?: number, b: string }'}  | ${partial({ a: number, b: string }).withRequired({ b: string })}
        ${'{ a: number, b: string }'}   | ${object({ a: number }).withRequired({ b: string })}
        ${'{ a: number, b?: string }'}  | ${object({ a: number }).withOptional({ b: string })}
        ${'{ a: number, b?: string }'}  | ${object({ a: number, b: boolean }).withOptional({ b: string })}
        ${'MyObject'}                   | ${object('MyObject', { a: number }).withOptional({ b: string })}
        ${'MyPartial'}                  | ${object('MyObject', { a: number }).withOptional('MyPartial', { b: string })}
    `('default name: $name', ({ impl, name }) => {
        expect(impl).toHaveProperty('name', name);
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

    describe('withOptional', () => {
        type MyTypeWithOptional = The<typeof MyTypeWithOptional>;
        const MyTypeWithOptional = MyType.withOptional({
            // `n` becomes optional now:
            n: number,
            b: boolean,
        });

        test('construction', () => {
            expect(MyTypeWithOptional).toBeInstanceOf(InterfaceType);
            expect(MyTypeWithOptional.name).toBe('{ s: string, n?: number, b?: boolean }');
            expect(MyTypeWithOptional.props).toStrictEqual({ s: string, n: number, b: boolean });
            expect(MyTypeWithOptional.propsInfo).toStrictEqual({
                s: { type: string, partial: false },
                n: { type: number, partial: true },
                b: { type: boolean, partial: true },
            });

            const Alternative = MyType.mergeWith(partial({ n: number, b: boolean }));
            expect(MyTypeWithOptional.name).toBe(Alternative.name);
            expect(MyTypeWithOptional.props).toEqual(Alternative.props);
            expect(MyTypeWithOptional.propsInfo).toEqual(Alternative.propsInfo);
        });

        test('check for accidental dropping of parsers', () => {
            const TypeA = object('TypeA', { prop: string }).withParser(unknownRecord.andThen(({ prop, old }) => ({ prop: prop ?? old })));
            expect(() => TypeA.withOptional({ other: string })).toThrowErrorMatchingInlineSnapshot(
                '"Error in TypeA.withOptional(): Merge operation not allowed because one of the types has custom parsers applied, use ' +
                    '`omitParsers` to suppress this error."',
            );

            // Resulting in erased parsers:
            expect(TypeA({ old: 'whatever' })).toEqual({ prop: 'whatever' });
            const Combined = TypeA.withOptional({ omitParsers: true }, { other: string });
            expect(() => Combined({ old: 'whatever' })).toThrow('missing property <prop>');
            expect(() => Combined.literal({ prop: 'whatever' })).not.toThrow();
        });

        test('support reuse of validators, but only when non-conflicting', () => {
            const TypeA = object('TypeA', { prop: string }).withValidation(v => v.prop === 'the value');
            expect(() => TypeA.withRequired({ prop: number })).toThrowErrorMatchingInlineSnapshot(
                '"Error in TypeA.withRequired(): Merge operation not allowed because one of the types has custom validations applied ' +
                    'and the following property is defined on both sides: <prop>, use `omitValidations` to suppress this error or ' +
                    'remove the conflicting property."',
            );

            // Validations erased, because that is the only way to overwrite the type of `prop`.
            const ValidationsIgnored = TypeA.withRequired({ omitValidations: true }, { prop: number });
            expect(ValidationsIgnored.literal({ prop: 123 })).toEqual({ prop: 123 });
            expect(() => ValidationsIgnored({ prop: 'string' })).toThrow('expected a number, got a string');

            // Validations reused, because no properties are conflicting.
            const ValidationsReused = TypeA.withRequired({ other: string });
            expect(ValidationsReused.literal({ prop: 'the value', other: 'correct' })).toEqual({ prop: 'the value', other: 'correct' });
            expect(() => ValidationsReused.literal({ prop: 'wrong value', other: 'correct' })).toThrow('additional validation failed');
        });

        testTypes('type of props and the resulting type', () => {
            const { props, propsInfo } = MyTypeWithOptional;
            assignableTo<{ s: typeof string; n: typeof number }>(props);
            assignableTo<typeof props>({ n: number, s: string, b: boolean });
            assignableTo<{
                s: { partial: boolean; type: typeof string };
                n: { partial: boolean; type: typeof number };
                b: { partial: boolean; type: typeof boolean };
            }>(propsInfo);
            assignableTo<typeof propsInfo>({
                s: { partial: false, type: string },
                n: { partial: false, type: number },
                b: { partial: true, type: boolean },
            });
            assignableTo<MyTypeWithOptional>({ s: 'asdf' });
            assignableTo<MyTypeWithOptional>({ n: 123, s: 'asdf' });
            assignableTo<MyTypeWithOptional>({ n: 123, s: 'asdf', b: true });
            // @ts-expect-error because q is not included in the type
            assignableTo<MyTypeWithOptional>({ n: 123, s: 'asdf', q: true });
            assignableTo<{ n?: number; s: string; b?: boolean }>(MyTypeWithOptional(0));
            // @ts-expect-error because n is optional now
            assignableTo<{ n: number; s: string; b?: boolean }>(MyTypeWithOptional(0));
        });
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
