import type { Type } from '../interfaces.js';
import { SimpleType } from '../simple-type.js';
import { basicTypeChecker, castArray } from '../utils/index.js';

/**
 * Built-in validator that accepts all values.
 *
 * @remarks
 * Can be sub-typed with {@link BaseTypeImpl.withConstraint}.
 */
export const unknown: Type<unknown> = SimpleType.create('unknown', 'mixed', () => true, {
    acceptVisitor: (type, visitor) => visitor.visitUnknownType(type),
});

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
export const unknownRecord: Type<unknownRecord> = SimpleType.create('Record<string, unknown>', 'object', basicTypeChecker('object'), {
    acceptVisitor: (type, visitor) => visitor.visitUnknownRecordType(type),
});

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
    acceptVisitor: (type, visitor) => visitor.visitUnknownArrayType(type),
});
