import type { BaseTypeImpl } from './base-type';
import { reportError } from './error-reporter';
import type { Failure, FailureDetails, Result } from './interfaces';
import { hasOwnProperty, isObject } from './utils';

export class ValidationError extends Error implements Failure {
    static fromFailure(failure: Omit<Failure, 'ok'>): ValidationError {
        return new ValidationError(reportError(failure), failure.type, failure.value, failure.details);
    }

    static try<Return>({ type, value }: Pick<Failure, 'type' | 'value'>, fn: () => Return): Result<Return> {
        try {
            return { ok: true, value: fn() };
        } catch (error: unknown) {
            if (error instanceof ValidationError) {
                return { ...error, type, value };
            }
            const message = String(isObject(error) && hasOwnProperty(error, 'message') ? error.message : error);
            return { ok: false, type, value, details: [{ kind: 'custom message', message, type, value }] };
        }
    }

    readonly name = 'ValidationError';
    readonly ok = false;

    private constructor(message: string, public type: BaseTypeImpl<unknown>, public value: unknown, public details: FailureDetails[] = []) {
        super(message);
    }
}
