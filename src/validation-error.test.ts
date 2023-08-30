import type { Failure } from './interfaces.js';
import { unknown } from './types/index.js';
import { ValidationError } from './validation-error.js';

describe(ValidationError, () => {
    const type = unknown.withName('GreatType');
    const input = { toString: () => '[custom string]' };

    describe('fromFailure', () => {
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
        test.each(CASES)('%p', (input, props) => {
            const err = ValidationError.fromFailure({ ...input, ok: false });
            expect({ ...err, message: err.message }).toMatchObject(props);
            expect(err).toBeInstanceOf(ValidationError);
            expect(err).toBeInstanceOf(Error);
            expect(err.name).toBe('ValidationError');
            expect(err.constructor).toBe(ValidationError);
        });
    });

    describe('try', () => {
        test('ok result', () => {
            const result = ValidationError.try({ type, input }, () => 'the result');
            expect(result).toEqual({ ok: true, value: 'the result' });
        });

        test('throw a ValidationError', () => {
            const failure: Failure = {
                input,
                type,
                ok: false,
                details: [{ kind: 'custom message', input, message: 'the message here', type }],
            };
            const result = ValidationError.try({ type, input }, () => {
                throw ValidationError.fromFailure(failure);
            });
            expect(result).toEqual(failure);
        });

        test('throw another Error', () => {
            const result = ValidationError.try({ type, input }, () => {
                throw new Error('the message');
            });
            expect(result).toEqual({ input, type, ok: false, details: [{ kind: 'custom message', input, message: 'the message', type }] });
        });

        test('throw something else', () => {
            const result = ValidationError.try({ type, input }, () => {
                throw 'the message';
            });
            expect(result).toEqual({ input, type, ok: false, details: [{ kind: 'custom message', input, message: 'the message', type }] });
        });
    });
});
