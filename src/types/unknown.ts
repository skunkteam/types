import { BaseTypeImpl, createType } from '../base-type';
import type { Result, TypeImpl } from '../interfaces';
import { castArray, define, isObject } from '../utils';

/**
 * The implementation behind all sub-types of {@link unknown}.
 */
export class UnknownType<ResultType = unknown> extends BaseTypeImpl<ResultType> {
    readonly name = 'unknown';
    readonly basicType!: 'mixed';

    typeValidator(input: unknown): Result<ResultType> {
        return this.createResult(input, input, true);
    }
}
define(UnknownType, 'basicType', 'mixed');

/**
 * The implementation behind all sub-types of {@link unknownRecord}.
 */
export class UnknownRecordType<ResultType extends Record<string, unknown> = Record<string, unknown>> extends BaseTypeImpl<ResultType> {
    readonly name = 'Record<string, unknown>';
    readonly basicType!: 'object';

    typeValidator(input: unknown): Result<ResultType> {
        return this.createResult(input, input, isObject(input) || { type: this, input, kind: 'invalid basic type', expected: 'object' });
    }
}
define(UnknownRecordType, 'basicType', 'object');

/**
 * The implementation behind all sub-types of {@link unknownArray}.
 */
export class UnknownArrayType<ResultType extends unknown[] = unknown[]> extends BaseTypeImpl<ResultType> {
    readonly name = 'unknown[]';
    readonly basicType!: 'array';

    typeValidator(input: unknown): Result<ResultType> {
        return this.createResult(
            input,
            input,
            Array.isArray(input) || { type: this, input, kind: 'invalid basic type', expected: 'array' },
        );
    }
}
define(UnknownArrayType, 'autoCaster', castArray);
define(UnknownArrayType, 'basicType', 'array');

/**
 * Built-in validator that accepts all values.
 *
 * @remarks
 * Can be sub-typed with {@link BaseTypeImpl.withConstraint}.
 */
export const unknown: TypeImpl<UnknownType> = createType(new UnknownType());

/**
 * Built-in validator that accepts all objects (`null` is not accepted).
 *
 * @remarks
 * Can be sub-typed with {@link BaseTypeImpl.withConstraint}.
 */
export const unknownRecord: TypeImpl<UnknownRecordType> = createType(new UnknownRecordType());

/**
 * Built-in validator that accepts all arrays.
 *
 * @remarks
 * Can be sub-typed with {@link BaseTypeImpl.withConstraint}.
 */
export const unknownArray: TypeImpl<UnknownArrayType> = createType(new UnknownArrayType());
