import type { Type } from '../interfaces';
import { SimpleType } from '../simple-type';
import { basicTypeChecker, castArray, fallbackStringify } from '../utils';

/**
 * Built-in validator that accepts all values.
 *
 * @remarks
 * Can be sub-typed with {@link BaseTypeImpl.withConstraint}.
 */
export const unknown: Type<unknown> = SimpleType.create('unknown', 'mixed', () => true, {
    acceptVisitor: (type, visitor) => visitor.visitUnknownType(type),
    maybeStringify: fallbackStringify,
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
export const unknownRecord: Type<unknownRecord> = SimpleType.create<unknownRecord>(
    'Record<string, unknown>',
    'object',
    basicTypeChecker('object'),
    {
        acceptVisitor: (type, visitor) => visitor.visitUnknownRecordType(type),
        maybeStringify: fallbackStringify,
    },
);

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
export const unknownArray: Type<unknownArray> = SimpleType.create<unknownArray>('unknown[]', 'array', basicTypeChecker('array'), {
    autoCaster: castArray,
    acceptVisitor: (type, visitor) => visitor.visitUnknownArrayType(type),
    maybeStringify: fallbackStringify,
});
