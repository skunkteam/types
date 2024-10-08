import type { BasicType, PropertyInfo } from '../interfaces';

/**
 * Default stringifier for all primitive values.
 *
 * @remarks
 *
 * Returns a valid JSON string for all supported value types and `undefined` if the value should be ignored matching the behavior of the
 * builtin `JSON.stringify`. This function does no typechecking and branches solely on the given `valueType`.
 *
 * @param valueType - the known kind of `value`, determines which method to use, is not checked against the actual `value`
 * @param value - the value to stringify
 * @param name - the name of the type, used for error messages
 * @returns a valid JSON string or `undefined` if the value should be ignored in JSON representation
 */
export function defaultStringify(valueType: BasicType | 'mixed', value: unknown, name: string): string | undefined {
    switch (valueType) {
        case 'function':
        case 'symbol':
        case 'undefined':
            return undefined;
        case 'bigint':
            // Throws Error by default, but supports unholy prototype polution (BigInt.prototype.toJSON) should people want to go there.
            return fallbackStringify(value);
        case 'boolean':
            return booleanStringify(value as boolean);
        case 'null':
            return 'null';
        case 'number':
            return numberStringify(value as number);
        case 'string':
            return stringStringify(value as string);
        // objects arrays and mixed types need to provide a more specific stringify function:
        case 'object':
        case 'array':
        case 'mixed':
            throw new Error('stringify not supported on type ' + name);
    }
}

export function numberStringify(value: number): string {
    return Number.isFinite(value) ? value.toString() : 'null';
}

export function booleanStringify(value: boolean): string {
    return value ? 'true' : 'false';
}

/**
 * A RegExp that checks for the presence of characters that need escaping in JSON, see the corresponding test file to see how to create
 * this pattern.
 */
// eslint-disable-next-line no-control-regex
export const NEEDS_ESCAPE = /[\u0000-\u001f\u0022\u005c\ud800-\udfff]/;

export function stringStringify(value: string): string {
    if (!NEEDS_ESCAPE.test(value)) return `"${value}"`;
    return fallbackStringify(value);
}

export function fallbackStringify(value: unknown): string {
    return JSON.stringify(value);
}

export function interfaceStringify(propsArray: ReadonlyArray<[string, PropertyInfo]>, value: Record<string, unknown>): string {
    return (
        '{' +
        propsArray
            .map(([key, { type }]) => {
                const propValue = value[key];
                if (propValue === undefined) return;
                const propString = type.maybeStringify(propValue);
                return propString && `${stringStringify(key)}:${propString}`;
            })
            .filter(Boolean)
            .join() +
        '}'
    );
}
