/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import type { StandardSchemaV1 } from '@standard-schema/spec';
import assert from 'assert';
import type { BaseObjectLikeTypeImpl, BaseTypeImpl } from './base-type';
import type { BasicType, LiteralValue, NumberTypeConfig, OneOrMore, StringTypeConfig, Type, Visitor } from './interfaces';
import type { ArrayType, KeyofType, LiteralType, RecordType, UnionType } from './types';
import { an, basicType, printValue } from './utils';
import { ValidationError } from './validation-error';

/** Test case for a type. */
export interface TypeTestCase {
    /** The expected name of the type */
    name: string;
    /** The type to test. Can be a single type or an array of types. */
    type: Type<any> | Type<any>[];
    basicType?: BasicType | 'mixed';
    /** Values that the type should accept as being valid. Note that the parser is not used for these values. */
    validValues?: unknown[];
    /**
     * Values that the type should not accept as being valid. Again, no parser is used for these values. Note that this input is also used
     * for invalidConversions unless provided explicitly. Therefore it is also possible to provide the third parameter (`issues`) here. Look
     * at invalidConversions for more details.
     */
    invalidValues?: [value: unknown, message: string | string[] | RegExp, issues?: StandardSchemaV1.Issue[]][];
    /** Values that type should accept as being valid after applying any parsers. */
    validConversions?: [input: unknown, value: unknown][];
    /**
     * Values that the type should not accept as being valid after applying any parsers. These cases are also applied to the standard schema
     * validation because that is linked to our validation "in construct mode". The third parameter can be given to override our default
     * expectations of the standard schema error messages. In a lot of cases we can determine this automatically, but in some cases we
     * cannot.
     */
    invalidConversions?: [input: unknown, message: string | string[] | RegExp, issues?: StandardSchemaV1.Issue[]][];
}

/**
 * Symbol to use to associate a "stripped" value with a test input-value.
 *
 * @remarks
 *
 * During testing objects often have more properties than are strictly needed for the type under test. However, all test-values are used to
 * test value-stripping during `#stringify` operations (and in the future maybe a `#strip` operation). Using this Symbol, it is possible to
 * associate a "stripped" version of a value, by assigning this stripped value to the input value, the test-framework will use those
 * stripped values instead of the complete input value while testing `#stringify`.
 */
export const stripped = Symbol('stripped');

export function testTypeImpl({
    name,
    basicType: expectedBasicType,
    type: types,
    validValues,
    invalidValues,
    validConversions,
    // Also test the same conditions using the `construct` method, instead of only using the `check` method. This also ensures we take the
    // standard schema validation into account.
    invalidConversions = invalidValues,
}: TypeTestCase): void {
    describe(`test: ${name}`, () => {
        Array.isArray(types) ? describe.each(types)('implementation %#', theTests) : theTests(types);
    });

    function theTests(type: Type<any>) {
        test(`name should be ${JSON.stringify(name)}`, () => {
            expect(type.name).toBe(name);
        });

        test('visitor test', () => {
            expect(() => createExample(type)).not.toThrow();
        });

        expectedBasicType &&
            test(`basicType should be "${expectedBasicType}"`, () => {
                expect(type.basicType).toBe(expectedBasicType);
            });

        validValues &&
            test.each(validValues)('accepts: %p', value => {
                expect(type.check(value)).toBe(value);
                expect(type.is(value)).toBeTrue();
            });

        validValues &&
            test.each(validValues)('correctly stringifies: %p', value => {
                const jsonStr = JSON.stringify(typeof value === 'object' && value && stripped in value ? value[stripped] : value);
                expect(type.maybeStringify(value)).toBe(jsonStr);
                if (jsonStr) {
                    expect(type.stringify(value)).toBe(jsonStr);
                } else {
                    expect(() => type.stringify(value)).toThrow('Do not know how to serialize a');
                }
            });

        invalidValues &&
            test.each(invalidValues)('does not accept: %p', (value, message) => {
                expect(() => type.check(value)).toThrowWithMessage(
                    ValidationErrorForTest,
                    Array.isArray(message) ? message.join('\n') : message,
                );
                expect(type.is(value)).toBeFalse();
            });

        validConversions &&
            test.each(validConversions)('converting input %p into %p', (input, output) => {
                expect(type(input)).toEqual(output);
                expect(type.apply(undefined, [input])).toEqual(output);
                expect(type.bind(undefined, input)()).toEqual(output);
                expect(type.call(undefined, input)).toEqual(output);
                expect(standardValidate(type, input)).toEqual({ value: output });
            });

        invalidConversions &&
            test.each(invalidConversions)('will not convert: %p', (value, message, issues = defaultIssues(message)) => {
                expect(() => type(value)).toThrowWithMessage(ValidationErrorForTest, Array.isArray(message) ? message.join('\n') : message);
                expect(standardValidate(type, value)).toEqual({ issues });
            });
    }
}

/** Just `ValidationError`, but with public constructor, so it can be passed to `toThrowWithMessage`. */
export const ValidationErrorForTest = ValidationError as typeof ValidationError & { new (): ValidationError };

export const USUAL_SUSPECTS = [false, true, null, undefined];
export function defaultUsualSuspects(type: Type<any> | string): [value: unknown, message: string][] {
    return USUAL_SUSPECTS.map(value => [value, basicTypeMessage(type, value)]);
}

export function defaultMessage(type: Type<any> | string, value: unknown): string {
    const name = typeof type === 'string' ? type : type.name;
    return `expected ${an(`[${name}]`)}, got: ${printValue(value)}`;
}

export function basicTypeMessage(type: Type<any> | string, value: unknown): string {
    const name = typeof type === 'string' ? type : type.name;
    const expected = an(typeof type === 'string' ? type : type.basicType);
    const bt = basicType(value);
    const v = printValue(value);
    return `error in [${name}]: expected ${expected}, got ${an(bt)}${bt !== v ? ` (${v})` : ''}`;
}

export function createExample<T>(type: Type<T>, seed?: number): T {
    const example = type.accept(new CreateExampleVisitor(seed));
    try {
        return type.check(example);
    } catch {
        return type.construct(example);
    }
}

class CreateExampleVisitor implements Visitor<unknown> {
    constructor(private seed = 1) {}

    visitArrayType(type: ArrayType<BaseTypeImpl<unknown>, unknown, unknown[]>): unknown {
        if (hasExample(type)) return type.example;
        const { maxLength = Infinity, minLength = -Infinity } = type.typeConfig;
        const length = Math.min(Math.max(this.seed++ % 5 || 1, minLength), maxLength);
        return Array.from({ length }, () => type.elementType.accept(this));
    }

    visitBooleanType(): unknown {
        return [true, false][this.seed++ % 2];
    }

    visitObjectLikeType(type: BaseObjectLikeTypeImpl<unknown>): unknown {
        if (hasExample(type)) return type.example;
        return Object.fromEntries(Object.entries(type.props).map(([key, propType]) => [key, propType.accept(this)]));
    }

    visitKeyofType(type: KeyofType<Record<any, any>, any>): unknown {
        return type.enumerableLiteralDomain[this.seed++ % type.enumerableLiteralDomain.length];
    }

    visitLiteralType(type: LiteralType<LiteralValue>): unknown {
        return type.value;
    }

    visitNumberType(type: BaseTypeImpl<number, NumberTypeConfig>): unknown {
        if (hasExample(type)) return type.example;
        const { max = Infinity, maxExclusive = Infinity, min = -Infinity, minExclusive = -Infinity, multipleOf = 0.01 } = type.typeConfig;
        const attempt = Math.min(Math.max(this.seed++ * multipleOf, min, minExclusive + multipleOf), max, maxExclusive - multipleOf);
        if (type.is(attempt)) return attempt;
        throw new Error(`Could not find an example for ${type.name}`);
    }

    visitRecordType(
        type: RecordType<BaseTypeImpl<string | number>, string | number, BaseTypeImpl<unknown>, unknown, Record<string | number, unknown>>,
    ): unknown {
        if (hasExample(type)) return type.example;
        const keys = type.keyType.enumerableLiteralDomain || [type.keyType.accept(this)];
        return Object.fromEntries([...keys].map(key => [key, type.valueType.accept(this)]));
    }

    visitStringType(type: BaseTypeImpl<string, StringTypeConfig>): unknown {
        if (hasExample(type)) return type.example;
        const { maxLength = Infinity, minLength = -Infinity, pattern } = type.typeConfig;
        if (pattern) throw new Error('String patterns are not supported.');
        const length = Math.min(Math.max(this.seed++ % 25, minLength), maxLength);
        return 'x'.repeat(length);
    }

    visitUnionType(type: UnionType<OneOrMore<BaseTypeImpl<unknown>>, unknown>): unknown {
        return type.types[this.seed++ % type.types.length]?.accept(this);
    }

    visitUnknownType(type: BaseTypeImpl<unknown>): unknown {
        if (hasExample(type)) return type.example;
        return 'UNKNOWN';
    }

    visitUnknownRecordType(type: BaseTypeImpl<Record<string, unknown>>): unknown {
        if (hasExample(type)) return type.example;
        return { unknown: 'record' };
    }

    visitUnknownArrayType(type: BaseTypeImpl<unknown[]>): unknown {
        if (hasExample(type)) return type.example;
        return ['unknown', 'array'];
    }

    visitCustomType(type: BaseTypeImpl<unknown>): unknown {
        if (hasExample(type)) return type.example;
        throw new Error(`Please provide a manual example for type: ${type.name}`);
    }
}

function hasExample<T>(obj: BaseTypeImpl<T>): obj is BaseTypeImpl<T> & { example: T } {
    return 'example' in obj;
}

/**
 * Helper function around StandardSchema validation interface to incorporate it in the existing conversion tests.
 *
 * Note that Skunkteam Types has a distinction between checking if an input conforms to a schema (Type) as-is (`.is()`, `.check()`) vs
 * validating if an input can be parsed and converted into the schema (`.construct()`). This makes it non-trivial to fully incorporate
 * the StandardSchema interface into the existing test-suite.
 */
function standardValidate<T>(schema: StandardSchemaV1<T>, input: unknown): StandardSchemaV1.Result<T> {
    const result = schema['~standard'].validate(input);
    if (result instanceof Promise) throw new TypeError('No asynchronous type validation in Skunkteam Types');
    return result;
}

function defaultIssues(input: string | RegExp | string[]): StandardSchemaV1.Issue[] {
    const message = Array.isArray(input) ? input.join('\n') : typeof input === 'string' ? input : expect.stringMatching(input);
    // Perform some string parsing on the error to guess what the standard schema issue should look like. This is just to prevent having to
    // configure a lot of expectations, but does not cover every possibility. Especially multiple errors will have to be stated explicitly.
    //
    // Things we do here:
    // - Remove the common header that says "error in {optional context} [TheTypeName]:", because that should not be part of the issues
    //   list.
    // - Try to guess the path if any.
    const hasPath = typeof message === 'string' && /^error in [^[]*\[.*?\](?: at [^<]*<(?<path>[^>]+)>)?: (?<message>[^]*)$/.exec(message);
    if (hasPath) {
        assert(hasPath.groups);
        return [
            {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- TypeScript is wrong here
                path: hasPath.groups.path?.split('.').map(key => (/^\[\d+\]$/.test(key) ? +key.slice(1, -1) : key)),
                message: hasPath.groups.message,
            },
        ];
    }
    // if (typeof message === 'string') message = message.replace(/^error in .*\[.*\]: /, '');
    return [{ message }];
}
