import { autoCast, autoCastAll } from '../autocast';
import type { OneOrMore, The } from '../interfaces';
import { assignableTo, defaultUsualSuspects, stripped, testTypeImpl, testTypes } from '../testutils';
import { boolean } from './boolean';
import { InterfacePickOptions, InterfaceType, object, partial } from './interface';
import { undefinedType } from './literal';
import { number } from './number';
import { string } from './string';
import './union';
import { unknown, unknownRecord } from './unknown';

testTypeImpl({
    name: '{ force?: boolean }',
    type: [
        partial({ force: boolean }),
        // contrived way to get the same result, should behave exactly the same
        object({ force: boolean }).withOptional({ force: boolean }),
        partial({ force: boolean, removeThis: string }).pick(['force']),
        partial({ force: boolean, removeThis: string }).omit(['removeThis']),
    ],
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

const Amounts = object({ begin: number, end: number });
testTypeImpl({
    name: '{ really?: AutoCast<boolean>, amounts?: { begin: AutoCast<number>, end: AutoCast<number> } }',
    type: [
        autoCastAll(partial({ really: boolean, amounts: Amounts })),
        autoCastAll(partial({ really: boolean, amounts: Amounts, removeThis: string })).pick(['really', 'amounts']),
        autoCastAll(partial({ really: boolean, amounts: Amounts, removeThis: string }).omit(['removeThis'])),
        partial({ really: autoCast(boolean) }).withOptional({ amounts: autoCastAll(Amounts) }),
    ],
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

testTypeImpl({ name: 'AutoCastAll<CustomNamed>', type: autoCastAll(object('CustomNamed', { prop: string })) });
testTypeImpl({ name: 'Pick<AutoCastAll<CustomNamed>, "prop">', type: autoCastAll(object('CustomNamed', { prop: string })).pick(['prop']) });
testTypeImpl({ name: 'AutoCastAll<Pick<CustomNamed, "prop">>', type: autoCastAll(object('CustomNamed', { prop: string }).pick(['prop'])) });

const specialStringOrUndefined = string.or(undefinedType).withParser(i => i || '<empty>');
testTypeImpl({
    name: '{ presenceNotRequired: string | undefined }',
    type: [
        object({ presenceNotRequired: specialStringOrUndefined }),
        object({ presenceNotRequired: specialStringOrUndefined, removeThis: string }).omit(['removeThis']),
    ],
    basicType: 'object',
    validValues: [{ presenceNotRequired: undefined }, { presenceNotRequired: 'abc' }],
    validConversions: [[{}, { presenceNotRequired: '<empty>' }]],
});

testTypeImpl({
    name: '{ presenceRequired: string | undefined }',
    type: [
        object({ strictMissingKeys: true }, { presenceRequired: specialStringOrUndefined }),
        object({ strictMissingKeys: true }, { presenceRequired: specialStringOrUndefined, removeThis: string }).omit(['removeThis']),
    ],
    validValues: [{ presenceRequired: undefined }, { presenceRequired: 'abc' }],
    invalidValues: [
        [{}, 'error in [{ presenceRequired: string | undefined }]: missing property <presenceRequired> [string | undefined], got: {}'],
    ],
    validConversions: [[{ presenceRequired: undefined }, { presenceRequired: '<empty>' }]],
});

testTypeImpl({
    name: '{ undefinedNotAllowed?: string, undefinedAllowed?: string | undefined }',
    type: [
        object({ strictMissingKeys: true, partial: true }, { undefinedNotAllowed: string, undefinedAllowed: specialStringOrUndefined }),
        object({ strictMissingKeys: true }, {}).withOptional({ undefinedNotAllowed: string, undefinedAllowed: specialStringOrUndefined }),
        object(
            { strictMissingKeys: true, partial: true },
            { undefinedNotAllowed: string, undefinedAllowed: specialStringOrUndefined, removeThis: string },
        ).pick(['undefinedNotAllowed', 'undefinedAllowed']),
    ],
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
        ${'{ a?: number }'}             | ${object('CustomNameThatIsRemoved', { a: boolean }).withOptional({ name: null }, { a: number })}
        ${'{ a?: number }'}             | ${partial('CustomNameThatIsRemoved', { a: number, removeThis: string }).pick({ name: null }, ['a'])}
        ${'{ a?: number }'}             | ${partial('CustomNameThatIsRemoved', { a: number, removeThis: string }).omit({ name: null }, ['removeThis'])}
    `('default name: $name', ({ impl, name }) => {
        expect(impl).toHaveProperty('name', name);
    });

    testTypes('type of keys and props', () => {
        const { keys, props, propsInfo } = MyType;
        assignableTo<{ s: typeof string; n: typeof number }>(props);
        assignableTo<{ s: { optional: boolean; type: typeof string }; n: { optional: boolean; type: typeof number } }>(propsInfo);
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

describe('withOptional', () => {
    type MyType = The<typeof MyType>;
    const MyType = object({ s: string, n: number });

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
            s: { type: string, optional: false },
            n: { type: number, optional: true },
            b: { type: boolean, optional: true },
        });

        const Alternative = MyType.mergeWith(partial({ n: number, b: boolean }));
        expect(MyTypeWithOptional.name).toBe(Alternative.name);
        expect(MyTypeWithOptional.props).toEqual(Alternative.props);
        expect(MyTypeWithOptional.propsInfo).toEqual(Alternative.propsInfo);
    });

    test('check for accidental dropping of parsers', () => {
        const TypeA = object('TypeA', { prop: string }).withParser(unknownRecord.andThen(({ prop, old }) => ({ prop: prop ?? old })));
        expect(() => TypeA.withOptional({ other: string })).toThrowError(
            'Error in TypeA.withOptional(): Merge operation not allowed because one of the types has custom parsers applied, use ' +
                '`omitParsers` to suppress this error.',
        );

        // Resulting in erased parsers:
        expect(TypeA({ old: 'whatever' })).toEqual({ prop: 'whatever' });
        const Combined = TypeA.withOptional({ omitParsers: true }, { other: string });
        expect(() => Combined({ old: 'whatever' })).toThrow('missing property <prop>');
        expect(() => Combined.literal({ prop: 'whatever' })).not.toThrow();
    });

    test('support reuse of validators, but only when non-conflicting', () => {
        const TypeA = object('TypeA', { prop: string }).withValidation(v => v.prop === 'the value');
        expect(() => TypeA.withRequired({ prop: number })).toThrowError(
            'Error in TypeA.withRequired(): Merge operation not allowed because one of the types has custom validations applied ' +
                'and the following property is defined on both sides: <prop>, use `omitValidations` to prevent this error or ' +
                'remove the conflicting property.',
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
            s: { optional: boolean; type: typeof string };
            n: { optional: boolean; type: typeof number };
            b: { optional: boolean; type: typeof boolean };
        }>(propsInfo);
        assignableTo<typeof propsInfo>({
            s: { optional: false, type: string },
            n: { optional: false, type: number },
            b: { optional: true, type: boolean },
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

describe.each(['pick', 'omit'] as const)('%s', method => {
    type BaseType = The<typeof BaseType>;
    const BaseType = object('BaseType', {
        mandatory: string,
        otherStuff: unknown,
    }).withOptional({
        optional: number,
        otherOptionalData: boolean,
    });

    function go(
        opts: InterfacePickOptions = {},
        keys: OneOrMore<keyof BaseType> = method === 'omit' ? ['otherStuff', 'otherOptionalData'] : ['mandatory', 'optional'],
    ) {
        switch (method) {
            case 'omit':
                return BaseType.omit(opts, keys);
            case 'pick':
                return BaseType.pick(opts, keys);
        }
    }

    switch (method) {
        case 'omit':
            testTypeImpl({ name: 'Omit<BaseType, "otherStuff" | "otherOptionalData">', type: go() });
            testTypeImpl({ name: '{ mandatory: string, optional?: number }', type: go({ name: null }) });
            break;
        case 'pick':
            testTypeImpl({ name: 'Pick<BaseType, "mandatory" | "optional">', type: go() });
            testTypeImpl({ name: '{ mandatory: string, optional?: number }', type: go({ name: null }) });
            // Order of the default name depends on the order of the keys given to pick:
            testTypeImpl({ name: '{ optional?: number, mandatory: string }', type: go({ name: null }, ['optional', 'mandatory']) });
            break;
    }

    type PickedType = The<typeof PickedType>;
    const PickedType =
        method === 'pick'
            ? BaseType.pick('PickedType', ['mandatory', 'optional'])
            : BaseType.omit('PickedType', ['otherStuff', 'otherOptionalData']);

    testTypeImpl({
        name: 'PickedType',
        type: PickedType,
        basicType: 'object',
        validValues: [{ mandatory: 'stuff' }, { mandatory: 'stuff', optional: 123 }],
        validConversions: [
            [
                { mandatory: 'stuff', otherStuff: 'whatever', optional: 0, otherOptionalData: true },
                { mandatory: 'stuff', optional: 0 },
            ],
        ],
        invalidValues: [[{ wrong: 'stuff' }, 'error in [PickedType]: missing property <mandatory> [string], got: { wrong: "stuff" }']],
    });

    test('construction', () => {
        expect(PickedType.props).toStrictEqual({ mandatory: string, optional: number });
        expect(PickedType.propsInfo).toStrictEqual({
            mandatory: { type: string, optional: false },
            optional: { type: number, optional: true },
        });
    });

    test('picking unknown keys', () => {
        expect(() => go({}, ['wrongName', 'otherWrongName'] as OneOrMore<any>)).toThrowError(
            `Error in BaseType.${method}(): Operations mentions one or more keys that do not exist on the base type: "wrongName" and ` +
                '"otherWrongName".',
        );
    });

    test('check for accidental dropping of validators', () => {
        const ValidatedType = object('ValidatedType', { prop: string, otherProp: string }).withValidation(v => v.prop === 'the value');

        const which = method === 'pick' ? 'prop' : 'otherProp';

        expect(() => ValidatedType[method]([which])).toThrowError(
            `Error in ValidatedType.${method}(): Operation not allowed because the base type has custom validations applied. Use ` +
                '`omitValidations` to prevent this error.',
        );

        // Validations erased, because that is the only way to pick from ValidatedType.
        const ValidationsIgnored = ValidatedType[method]({ omitValidations: true }, [which]);
        expect(ValidationsIgnored({ prop: 'string' })).toEqual({ prop: 'string' });
        expect(() => ValidationsIgnored({ prop: 123 })).toThrow('expected a string, got a number');
    });

    test('support reuse of parsers and require a choice from the developer', () => {
        const TypeWithParser = object('TypeWithParser', {
            prop: string,
            otherStuff: string,
        })
            // Add a parser to make sure we initialize prop with oldPropName because of some deprecation period blablabla...
            .withParser(unknownRecord.andThen(obj => ({ prop: obj.prop ?? obj.oldPropName })));

        const which = method === 'pick' ? 'prop' : 'otherStuff';

        expect(() => TypeWithParser[method]([which])).toThrowError(
            `Error in TypeWithParser.${method}(): The base type has a custom parser. Choose whether to reuse this parser with the ` +
                '`applyParser` option.',
        );

        // Reusing the parser because it made sense this time.
        const PickedWithParser = TypeWithParser[method]({ name: 'PickedWithParser', applyParser: true }, [which]);
        expect(PickedWithParser({ oldPropName: 'stuff' })).toStrictEqual({ prop: 'stuff' });

        // Don't reuse the parser because maybe it is not relevant here...
        const PickedWithoutParser = TypeWithParser[method]({ name: 'PickedWithoutParser', applyParser: false }, [which]);
        expect(() => PickedWithoutParser({ oldPropName: 'stuff' })).toThrowError(
            'error in [PickedWithoutParser]: missing property <prop> [string], got: { oldPropName: "stuff" }',
        );
    });

    testTypes('type of props and the resulting type', () => {
        const { props, propsInfo } = PickedType;
        assignableTo<{ mandatory: typeof string; optional: typeof number }>(props);
        assignableTo<typeof props>({ mandatory: string, optional: number });
        assignableTo<{
            mandatory: { optional: boolean; type: typeof string };
            optional: { optional: boolean; type: typeof number };
        }>(propsInfo);
        assignableTo<typeof propsInfo>({
            mandatory: { optional: false, type: string },
            optional: { optional: false, type: number },
        });
        assignableTo<PickedType>({ mandatory: 'asdf' });
        assignableTo<PickedType>({ mandatory: 'asdf', optional: 123 });
        // @ts-expect-error because q is not included in the type
        assignableTo<PickedType>({ mandatory: 'asdf', optional: 123, q: true });
        assignableTo<{ mandatory: string; optional?: number }>(PickedType(0));
    });

    method === 'omit' &&
        test('all properties omitted', () => {
            expect(() => PickedType.omit(['mandatory', 'optional'])).toThrow('Error in PickedType.omit(): All properties omitted.');
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
        expect(() => autoCastAll(CheckOnlyType)(wrongObj)).toThrow();

        expect(() => RegularType(wrongObj)).toThrow();
        expect(autoCastAll(RegularType)(wrongObj)).toEqual(correctObj);
    });
});
