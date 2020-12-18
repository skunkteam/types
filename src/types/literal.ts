import { BaseTypeImpl, createType } from '../base-type';
import type { BasicType, LiteralValue, Result, TypeImpl } from '../interfaces';
import { autoCastFailure } from '../symbols';
import { basicType, define, printValue } from '../utils';
import { booleanAutoCaster } from './boolean';
import { numberAutoCaster } from './number';

/**
 * The implementation behind types created with {@link literal} and {@link nullType}, {@link undefinedType} and {@link voidType}.
 */
export class LiteralType<ResultType extends LiteralValue> extends BaseTypeImpl<ResultType> {
    readonly name: string;

    constructor(readonly value: ResultType) {
        super();
        this.name = printValue(value);
    }

    readonly basicType: BasicType = basicType(this.value);
    readonly enumerableLiteralDomain = [this.value];

    protected typeValidator(input: unknown): Result<ResultType> {
        return this.createResult(
            input,
            input,
            input === this.value ||
                (basicType(input) !== this.basicType
                    ? { type: this, input, kind: 'invalid basic type', expected: this.basicType, expectedValue: this.value }
                    : { type: this, input, kind: 'invalid literal', expected: this.value }),
        );
    }
}

// Defined outside class definition, because TypeScript somehow ends up in a wild-typings-goose-chase that takes
// up to a minute or more. We have to make sure consuming libs don't have to pay this penalty ever.
define(LiteralType, 'autoCaster', function (this: LiteralType<LiteralValue>, input: unknown) {
    switch (this.basicType) {
        case 'string':
            return String(input);
        case 'number':
            return numberAutoCaster(input);
        case 'boolean':
            return booleanAutoCaster(input);
        case 'null':
        case 'undefined':
            return input == null ? this.value : autoCastFailure;
        // istanbul ignore next: not possible
        default:
            return autoCastFailure;
    }
});

export function literal<T extends LiteralValue>(value: T): TypeImpl<LiteralType<T>> {
    return createType(new LiteralType(value));
}

export const nullType: TypeImpl<LiteralType<null>> = literal(null);
export const undefinedType: TypeImpl<LiteralType<undefined>> = literal(undefined);
// PR comment: do we want to support this? Because people started using `void` before `--strictNullChecks`, it is still sometimes used as `null \ undefined` instead of just `undefined`. Maybe just leave it out, to avoid confusion?
export const voidType: TypeImpl<LiteralType<void>> = undefinedType;
