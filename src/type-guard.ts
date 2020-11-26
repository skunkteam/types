import { BaseTypeImpl } from './base-type';
import type { Type } from './interfaces';

export function isType(value: unknown): value is Type<unknown> {
    return typeof value === 'function' && value instanceof BaseTypeImpl;
}
