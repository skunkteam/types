import { BaseTypeImpl, createType } from '../base-type';
import type { Result, TypeImpl } from '../interfaces';
import { decodeOptionalName, hasOwnProperty, transpose, Transposed } from '../utils';

export class KeyofType<T extends Record<string, unknown>, ResultType extends keyof T = keyof T> extends BaseTypeImpl<ResultType> {
    readonly basicType = 'string';

    constructor(
        readonly keys: T,
        readonly name = Object.keys(keys)
            .map(key => JSON.stringify(key))
            .join(' | '),
    ) {
        super();
    }

    readonly enumerableLiteralDomain = new Set(Object.keys(this.keys));

    typeValidator(value: unknown): Result<ResultType> {
        if (typeof value !== 'string') {
            return this.createResult(value, { type: this, kind: 'invalid basic type', expected: 'string', value });
        }
        return this.createResult(value, hasOwnProperty(this.keys, value));
    }

    translate(input: unknown): T[keyof T] {
        this.assert(input);
        return this.keys[input];
    }

    protected autoCaster = String;
}

export function keyof<T extends Record<string, unknown>>(...args: [name: string, keys: T] | [keys: T]): TypeImpl<KeyofType<T>> {
    const [name, keys] = decodeOptionalName(args);
    return createType(new KeyofType(keys, name));
}

export function valueof<T extends Record<string, string>>(...args: [name: string, obj: T] | [obj: T]): TypeImpl<KeyofType<Transposed<T>>> {
    const [name, obj] = decodeOptionalName(args);
    return createType(new KeyofType(transpose(obj), name));
}
