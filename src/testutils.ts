/* eslint-disable @typescript-eslint/no-unsafe-return */

import type { BasicType, Type } from './interfaces';
import { an, basicType, printValue } from './utils';
import { ValidationError } from './validation-error';

export function assignableTo<T>(_value: T): void {
    // intentionally left blank
}

export function testTypes(..._args: [msg: string, fn: () => void] | [fn: () => void]): void {
    // intentionally left blank
}

export interface TypeTestCase {
    name: string;
    type: Type<any> | Type<any>[];
    basicType?: BasicType | 'mixed';
    validValues?: unknown[];
    invalidValues?: [value: unknown, message: string | string[] | RegExp][];
    validConversions?: [input: unknown, value: unknown][];
    invalidConversions?: [input: unknown, message: string | string[] | RegExp][];
}

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

        expectedBasicType &&
            test(`basicType should be "${expectedBasicType}"`, () => {
                expect(type.basicType).toBe(expectedBasicType);
            });

        validValues &&
            test.each(validValues)('accepts: %p', value => {
                expect(type.check(value)).toBe(value);
                expect(type.is(value)).toBeTrue();
            });

        invalidValues &&
            test.each(invalidValues)('does not accept: %p', (value, message) => {
                expect(() => type.check(value)).toThrowWithMessage(ValidationError, Array.isArray(message) ? message.join('\n') : message);
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
                expect(() => type(value)).toThrowWithMessage(ValidationError, Array.isArray(message) ? message.join('\n') : message);
            });
    }
}

export const USUAL_SUSPECTS = [false, true, null, undefined];
export function defaultUsualSuspects(type: Type<any> | string, baseType?: Type<any>): [value: unknown, message: string][] {
    return USUAL_SUSPECTS.map(value => [value, basicTypeMessage(type, value, baseType)]);
}

export function defaultMessage(type: Type<any> | string, value: unknown, baseType?: Type<any>): string {
    const name = typeof type === 'string' ? type : type.name;
    return baseType
        ? `error in base type of [${name}]: expected ${an(`[${baseType.name}]`)}, got: ${printValue(value)}`
        : `expected ${an(`[${name}]`)}, got: ${printValue(value)}`;
}

export function basicTypeMessage(type: Type<any> | string, value: unknown, baseType?: Type<any>): string {
    const name = typeof type === 'string' ? type : type.name;
    const ctx = baseType ? 'base type of ' : '';
    const expected = an(typeof type === 'string' ? type : type.basicType);
    const bt = basicType(value);
    const v = printValue(value);
    return `error in ${ctx}[${name}]: expected ${expected}, got ${an(bt)}${bt !== v ? ` (${v})` : ''}`;
}
