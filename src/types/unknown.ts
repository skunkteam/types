import { BaseTypeImpl, createType } from '../base-type';
import type { Result, TypeImpl } from '../interfaces';
import { castArray, isObject } from '../utils';

export class UnknownType<ResultType = unknown> extends BaseTypeImpl<ResultType> {
    readonly name = 'unknown';
    readonly basicType = 'mixed';

    typeValidator(value: unknown): Result<ResultType> {
        return this.createResult(value, true);
    }
}

export class UnknownRecordType<ResultType extends Record<string, unknown> = Record<string, unknown>> extends BaseTypeImpl<ResultType> {
    readonly name = 'Record<string, unknown>';
    readonly basicType = 'object';

    typeValidator(value: unknown): Result<ResultType> {
        return this.createResult(value, isObject(value) || { type: this, value, kind: 'invalid basic type', expected: 'object' });
    }
}

export class UnknownArrayType<ResultType extends unknown[] = unknown[]> extends BaseTypeImpl<ResultType> {
    readonly name = 'unknown[]';
    readonly basicType = 'array';

    typeValidator(value: unknown): Result<ResultType> {
        return this.createResult(value, Array.isArray(value) || { type: this, value, kind: 'invalid basic type', expected: 'array' });
    }

    protected autoCaster = castArray;
}

export const unknown: TypeImpl<UnknownType> = createType(new UnknownType());
export const unknownRecord: TypeImpl<UnknownRecordType> = createType(new UnknownRecordType());
export const unknownArray: TypeImpl<UnknownArrayType> = createType(new UnknownArrayType());
