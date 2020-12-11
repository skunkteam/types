import type { BaseTypeImpl } from './base-type';
import { reportError } from './error-reporter';
import type { Failure, FailureDetails, OneOrMore, Result } from './interfaces';
import { hasOwnProperty, isObject } from './utils';

/**
 * The error that is thrown on any validation- or parse-error within this library.
 *
 * @remarks
 * Is itself also a {@link Failure} and can be used as such in APIs.
 */
export class ValidationError extends Error implements Failure {
    /**
     * Creates a ValidationError with a human-readable error-report based on the given {@link Failure}.
     *
     * @param failure - the failure to throw
     */
    static fromFailure(failure: Omit<Failure, 'ok'>): ValidationError {
        return new ValidationError(reportError(failure), failure.type, failure.value, failure.details);
    }

    /**
     * Catch any errors thrown by `fn` and report the result as a {@link Result}.
     *
     * @param context - the type that is performing the validation and the original input value
     * @param fn - the function that could throw
     */
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

    private constructor(
        message: string,
        public type: BaseTypeImpl<unknown>,
        public value: unknown,
        public details: OneOrMore<FailureDetails>,
    ) {
        super(message);
    }
}
