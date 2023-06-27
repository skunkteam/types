import type { BasicType, Type } from '../interfaces.js';

export function defaultStringify(valueType: BasicType | 'mixed', value: unknown, name: string): string | undefined {
    switch (valueType) {
        case 'function':
        case 'symbol':
        case 'undefined':
            return undefined;
        case 'bigint':
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
    return value === true ? 'true' : 'false';
}

// eslint-disable-next-line no-control-regex
export const NEEDS_ESCAPE = /[\u0000-\u001f\u0022\u005c\ud800-\udfff]/;

export function stringStringify(value: string): string {
    if (!NEEDS_ESCAPE.test(value)) return `"${value}"`;
    return fallbackStringify(value);
}

export function fallbackStringify(value: unknown): string {
    return JSON.stringify(value);
}

export function interfaceStringify(propsArray: ReadonlyArray<[string, Type<unknown>]>, value: Record<string, unknown>): string {
    return (
        '{' +
        propsArray
            .map(([key, prop]) => {
                const propValue = value[key];
                if (propValue === undefined) return;
                const propString = prop.maybeStringify(propValue);
                return propString && `${stringStringify(key)}:${propString}`;
            })
            .filter(Boolean)
            .join() +
        '}'
    );
}
