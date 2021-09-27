import { BaseTypeImpl } from './base-type.js';
import type { Type } from './interfaces.js';

/**
 * Type-guard that asserts that a given value is a Type.
 */
export function isType(value: unknown): value is Type<unknown> {
    return typeof value === 'function' && value instanceof BaseTypeImpl;
}
