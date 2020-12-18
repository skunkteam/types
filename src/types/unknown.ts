import type { Type } from '../interfaces';
import { SimpleType } from '../simple-type';
import { castArray, isObject } from '../utils';

/**
 * Built-in validator that accepts all values.
 *
 * @remarks
 * Can be sub-typed with {@link BaseTypeImpl.withConstraint}.
 */
export const unknown: Type<unknown> = SimpleType.create('unknown', 'mixed', () => true);

/**
 * Built-in validator that accepts all objects (`null` is not accepted).
 *
 * @remarks
 * Can be sub-typed with {@link BaseTypeImpl.withConstraint}.
 */
export const unknownRecord: Type<Record<string, unknown>> = SimpleType.create(
    'Record<string, unknown>',
    'object',
    (type, input) => isObject(input) || { type, input, kind: 'invalid basic type', expected: 'object' },
);

/**
 * Built-in validator that accepts all arrays.
 *
 * @remarks
 * Can be sub-typed with {@link BaseTypeImpl.withConstraint}.
 */
export const unknownArray: Type<unknown[]> = SimpleType.create(
    'unknown[]',
    'array',
    (type, input) => Array.isArray(input) || { type, input, kind: 'invalid basic type', expected: 'array' },
    { autoCaster: castArray },
);
