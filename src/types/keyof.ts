import { BaseTypeImpl, createType } from '../base-type.js';
import type { Result, Transposed, TypeImpl, Visitor } from '../interfaces.js';
import { decodeOptionalName, define, hasOwnProperty, transpose } from '../utils/index.js';

/**
 * The implementation behind types created with {@link keyof} and {@link valueof}.
 */
export class KeyofType<T extends Record<string, unknown>, ResultType extends keyof T = keyof T> extends BaseTypeImpl<ResultType> {
    readonly basicType!: 'string';
    readonly typeConfig: undefined;

    constructor(
        readonly keys: T,
        readonly name = Object.keys(keys)
            .map(key => JSON.stringify(key))
            .join(' | '),
    ) {
        super();
    }

    override readonly enumerableLiteralDomain = Object.keys(this.keys);

    protected typeValidator(input: unknown): Result<ResultType> {
        return this.createResult(
            input,
            input,
            typeof input !== 'string'
                ? { kind: 'invalid basic type', expected: 'string' }
                : hasOwnProperty(this.keys, input) || { kind: 'invalid literal', expected: this.enumerableLiteralDomain },
        );
    }

    translate(input: unknown): T[keyof T] {
        this.assert(input);
        return this.keys[input];
    }

    accept<R>(visitor: Visitor<R>): R {
        return visitor.visitKeyofType(this);
    }
}
define(KeyofType, 'autoCaster', String);
define(KeyofType, 'basicType', 'string');

export function keyof<T extends Record<string, unknown>>(...args: [name: string, keys: T] | [keys: T]): TypeImpl<KeyofType<T>> {
    const [name, keys] = decodeOptionalName(args);
    return createType(new KeyofType(keys, name));
}

export function valueof<T extends Record<string, string>>(...args: [name: string, obj: T] | [obj: T]): TypeImpl<KeyofType<Transposed<T>>> {
    const [name, obj] = decodeOptionalName(args);
    return createType(new KeyofType(transpose(obj), name));
}
