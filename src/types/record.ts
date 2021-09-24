import { BaseTypeImpl, createType } from '../base-type.js';
import type { MessageDetails, Result, TypeImpl, ValidationOptions, Visitor } from '../interfaces.js';
import { decodeOptionalName, define, extensionName, prependPathToDetails } from '../utils/index.js';
import { unknownRecord } from './unknown.js';

/**
 * The implementation behind types created with {@link record}.
 */
export class RecordType<
    KeyTypeImpl extends BaseTypeImpl<KeyType>,
    KeyType extends number | string,
    ValueTypeImpl extends BaseTypeImpl<ValueType>,
    ValueType,
    ResultType extends Record<KeyType, ValueType> = Record<KeyType, ValueType>,
> extends BaseTypeImpl<ResultType> {
    readonly basicType!: 'object';
    readonly isDefaultName: boolean;
    readonly name: string;
    readonly typeConfig: undefined;

    constructor(readonly keyType: KeyTypeImpl, readonly valueType: ValueTypeImpl, name?: string, readonly strict = true) {
        super();
        this.isDefaultName = !name;
        this.name = name || `Record<${keyType.name}, ${valueType.name}>`;
    }

    protected typeValidator(input: unknown, options: ValidationOptions): Result<ResultType> {
        if (!unknownRecord.is(input)) {
            return this.createResult(input, undefined, { kind: 'invalid basic type', expected: 'object' });
        }
        const constructResult = {} as Record<KeyType, ValueType>;
        const details: MessageDetails[] = [];
        const missingKeys = this.keyType.enumerableLiteralDomain && new Set(this.keyType.enumerableLiteralDomain);
        for (const [key, value] of Object.entries(input)) {
            const keyResult = this.keyType.validate(key, options);
            const valueResult = this.valueType.validate(value, options);
            if (!keyResult.ok) {
                this.strict && details.push({ kind: 'invalid key', property: key, failure: keyResult });
                continue;
            }
            missingKeys?.delete(keyResult.value);
            if (!valueResult.ok) {
                details.push(...prependPathToDetails(valueResult, key));
            } else {
                constructResult[keyResult.value] = valueResult.value;
            }
        }
        if (missingKeys?.size) {
            for (const key of missingKeys) {
                details.push({ type: this.valueType, kind: 'missing property', property: String(key) });
            }
        }
        return this.createResult(input, options.mode === 'construct' ? constructResult : input, details);
    }

    accept<R>(visitor: Visitor<R>): R {
        return visitor.visitRecordType(this);
    }
}
define(RecordType, 'basicType', 'object');

// Defined outside class definition, because TypeScript somehow ends up in a wild-typings-goose-chase that takes
// up to a minute or more. We have to make sure consuming libs don't have to pay this penalty ever.
define(
    RecordType,
    'createAutoCastAllType',
    function (this: RecordType<BaseTypeImpl<number | string>, number | string, BaseTypeImpl<any>, any, Record<number | string, any>>) {
        const { keyType, valueType, strict } = this;
        const name = extensionName(this, 'autoCastAll');
        return createType(new RecordType(keyType.autoCastAll, valueType.autoCastAll, name, strict));
    },
);

/**
 * Note: record has strict validation by default, while type does not have strict validation, both are strict in construction though. TODO: document
 */
export function record<KeyType extends number | string, ValueType>(
    ...args:
        | [name: string, keyType: BaseTypeImpl<KeyType>, valueType: BaseTypeImpl<ValueType>, strict?: boolean]
        | [keyType: BaseTypeImpl<KeyType>, valueType: BaseTypeImpl<ValueType>, strict?: boolean]
): TypeImpl<RecordType<BaseTypeImpl<KeyType>, KeyType, BaseTypeImpl<ValueType>, ValueType>> {
    const [name, keyType, valueType, strict] = decodeOptionalName(args);
    return createType(new RecordType(acceptNumberLikeKey(keyType), valueType, name, strict));
}

function acceptNumberLikeKey<T extends BaseTypeImpl<number | string>>(type: T): T {
    return type.basicType === 'number' ? (new WrapNumericKeyType(type) as unknown as T) : type;
}

class WrapNumericKeyType<ResultType> extends BaseTypeImpl<ResultType> {
    readonly basicType = 'string';
    readonly typeConfig: undefined;

    constructor(readonly innerType: BaseTypeImpl<ResultType>) {
        super();
    }

    readonly name = this.innerType.name;
    override readonly enumerableLiteralDomain =
        this.innerType.enumerableLiteralDomain && [...this.innerType.enumerableLiteralDomain].map(String);

    protected typeValidator(input: unknown, options: ValidationOptions): Result<ResultType> {
        const number = input === '' ? NaN : +String(input);
        if (Number.isNaN(number)) {
            return this.createResult(input, undefined, `expected key to be numeric (because the key-type is: ${this.name})`);
        }
        const innerResult = this.innerType.validate(number, options);
        return this.createResult(input, String(input), innerResult.ok || innerResult.details);
    }

    accept<R>(visitor: Visitor<R>): R {
        return this.innerType.accept(visitor);
    }
}
