/* eslint-disable @typescript-eslint/no-unsafe-return */

import type { BaseObjectLikeTypeImpl, BaseTypeImpl } from './base-type';
import type { BasicType, LiteralValue, NumberTypeConfig, OneOrMore, StringTypeConfig, Type, Visitor } from './interfaces';
import type { ArrayType, KeyofType, LiteralType, RecordType, UnionType } from './types';
import { an, basicType, printValue } from './utils';
import { ValidationError } from './validation-error';

export interface TypeTestCase {
    name: string;
    type: Type<any> | Type<any>[];
    basicType?: BasicType | 'mixed';
    validValues?: unknown[];
    invalidValues?: [value: unknown, message: string | string[] | RegExp][];
    validConversions?: [input: unknown, value: unknown][];
    invalidConversions?: [input: unknown, message: string | string[] | RegExp][];
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
    invalidConversions,
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
            });

        invalidConversions &&
            test.each(invalidConversions)('will not convert: %p', (value, message) => {
                expect(() => type(value)).toThrowWithMessage(ValidationErrorForTest, Array.isArray(message) ? message.join('\n') : message);
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
