import type { Failure } from './interfaces.js';
import { unknown } from './types/index.js';
import { ValidationError } from './validation-error.js';

/* eslint-disable @typescript-eslint/no-unsafe-member-access */

describe(ValidationError, () => {
    const type = unknown.withName('GreatType');
    const input = { toString: () => '[custom string]' };
    const CASES: [failure: Omit<Failure, 'ok'>, expected: Partial<ValidationError>][] = [
        [
            { type, input, details: [{ type, input }] },
            { message: 'expected a [GreatType], got: "[custom string]"', type, input },
        ],
        [
            { type, input, details: [{ type, input, kind: 'custom message', message: 'custom message, hurray' }] },
            { message: 'error in [GreatType]: custom message, hurray, got: "[custom string]"', type, input },
        ],
        [
            {
                type,
                input,
                details: [
                    {
                        type,
                        input,
                        path: ['a', 'with space', 123],
                        kind: 'custom message',
                        message: 'expected a valid something, got something else',
                        omitInput: true,
                    },
                ],
            },
            {
                message: 'error in [GreatType] at <a["with space"][123]>: expected a valid something, got something else',
                type,
                input,
            },
        ],
    ];
    test.each(CASES)('with input: %p', (input, props) => {
        const err = ValidationError.fromFailure({ ...input, ok: false });
        expect({ ...err, message: err.message }).toMatchObject(props);
        expect(err).toBeInstanceOf(ValidationError);
        expect(err).toBeInstanceOf(Error);
        expect(err.name).toBe('ValidationError');
        expect(err.constructor).toBe(ValidationError);
    });
});
