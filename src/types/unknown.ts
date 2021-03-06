import type { Type } from '../interfaces';
import { SimpleType } from '../simple-type';
import { basicTypeChecker, castArray } from '../utils';

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
export type unknownRecord = Record<string, unknown>;
/**
 * Built-in validator that accepts all objects (`null` is not accepted).
 *
 * @remarks
 * Can be sub-typed with {@link BaseTypeImpl.withConstraint}.
 */
export const unknownRecord: Type<unknownRecord> = SimpleType.create('Record<string, unknown>', 'object', basicTypeChecker('object'));

/**
 * Built-in validator that accepts all arrays.
 *
 * @remarks
 * Can be sub-typed with {@link BaseTypeImpl.withConstraint}.
 */
export type unknownArray = unknown[];
/**
 * Built-in validator that accepts all arrays.
 *
 * @remarks
 * Can be sub-typed with {@link BaseTypeImpl.withConstraint}.
 */
export const unknownArray: Type<unknownArray> = SimpleType.create('unknown[]', 'array', basicTypeChecker('array'), {
    autoCaster: castArray,
});
