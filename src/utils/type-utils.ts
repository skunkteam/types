import type { BasicType, Failure, OneOrMore, Result, ValidationResult } from '../interfaces';

export function isOneOrMore<T>(arr: T[]): arr is OneOrMore<T> {
    return arr.length > 0;
}

export function checkOneOrMore<T>(arr: T[]): OneOrMore<T> {
    // istanbul ignore if
    if (!isOneOrMore(arr)) {
        throw new Error('expected at least one element, got nothing');
    }
    return arr;
}

export function isSingle<T>(arr: T[]): arr is [T] {
    return arr.length === 1;
}

export function hasOwnProperty<Key extends PropertyKey>(obj: object, key: Key): obj is Record<Key, unknown> {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

const VALID_IDENTIFIER_RE = /^[a-z_$][a-z_$0-9]*$/i;
export function isValidIdentifier(s: string): boolean {
    return VALID_IDENTIFIER_RE.test(s);
}

export function basicType(value: unknown): BasicType {
    return value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
}

export function isFailure(result: Result<unknown>): result is Failure {
    return !result.ok;
}

export function basicTypeChecker(expected: BasicType) {
    return (input: unknown): ValidationResult => basicType(input) === expected || { kind: 'invalid basic type', expected };
}
