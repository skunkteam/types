import { expectTypeOf } from 'expect-type';
import { autoCast } from '../autocast';
import type { The } from '../interfaces';
import { ValidationErrorForTest, basicTypeMessage, defaultUsualSuspects, testTypeImpl } from '../testutils';
import { keyof, valueof } from './keyof';
import { literal } from './literal';
import { union } from './union';

testTypeImpl({
    name: '"yes" | "no"',
    type: keyof({ yes: true, no: false }),
    basicType: 'string',
    validValues: ['yes', 'no'],
    invalidValues: [
        ['really', 'error in ["yes" | "no"]: expected one of the literals "yes" or "no", got: "really"'],
        [0, basicTypeMessage(keyof({ yes: 0, no: 0 }), 0)],
        [1, basicTypeMessage(keyof({ yes: 0, no: 0 }), 1)],
        ['', 'error in ["yes" | "no"]: expected one of the literals "yes" or "no", got: ""'],
        ...defaultUsualSuspects(keyof({ yes: 0, no: 0 })),
    ],
});

testTypeImpl({
    name: 'YourAnswer',
    type: keyof('YourAnswer', { yes: true, maybe: 'trouble', no: false }),
    validValues: ['yes', 'no', 'maybe'],
    invalidValues: [
        ['really', 'error in [YourAnswer]: expected one of the literals "yes", "maybe" or "no", got: "really"'],
        [0, basicTypeMessage(keyof('YourAnswer', {}), 0)],
        [1, basicTypeMessage(keyof('YourAnswer', {}), 1)],
        ['', 'error in [YourAnswer]: expected one of the literals "yes", "maybe" or "no", got: ""'],
        ...defaultUsualSuspects(keyof('YourAnswer', {})),
    ],
});

testTypeImpl({
    name: 'AutoCast<"0" | "1">',
    type: autoCast(keyof({ 0: 0, 1: 1 })),
    basicType: 'string',
    validValues: ['0', '1'],
    invalidValues: [[0, basicTypeMessage(autoCast(keyof({ 0: 0, 1: 1 })), 0)]],
    validConversions: [
        [0, '0'],
        [1, '1'],
    ],
    invalidConversions: [
        ['a', 'error in [AutoCast<"0" | "1">]: expected one of the literals "0" or "1", got: "a"'],
        [2, 'error in [AutoCast<"0" | "1">]: expected one of the literals "0" or "1", got: "2", parsed from: 2'],
    ],
});

describe(keyof, () => {
    type YourAnswer = The<typeof YourAnswer>;
    const YourAnswer = keyof('YourAnswer', { yes: true, maybe: 'trouble', no: false } as const);

    test.each`
        input      | output
        ${'yes'}   | ${true}
        ${'no'}    | ${false}
        ${'maybe'} | ${'trouble'}
        ${'huh?'}  | ${Error('error in [YourAnswer]: expected one of the literals "yes", "maybe" or "no", got: "huh?"')}
    `('#translate($input) -> $output', ({ input, output }) => {
        if (output instanceof Error) {
            expect(() => YourAnswer.translate(input)).toThrowWithMessage(ValidationErrorForTest, output.message);
        } else {
            expect(YourAnswer.translate(input)).toBe(output);
        }
    });

    test('types', () => {
        expectTypeOf<YourAnswer>().toEqualTypeOf<'yes' | 'no' | 'maybe'>();

        type AsUnion = The<typeof AsUnion>;
        const AsUnion = union([literal('maybe'), literal('yes'), literal('no')]);
        expectTypeOf(YourAnswer.literal('maybe')).toEqualTypeOf<YourAnswer>();
        expectTypeOf<YourAnswer>().toEqualTypeOf<AsUnion>();

        const translated = YourAnswer.translate('yes');
        expectTypeOf(translated).toEqualTypeOf<'trouble' | boolean>();
    });
});

describe(valueof, () => {
    enum StringEnum {
        One = 'uno',
        Two = 'dos',
    }
    const FromStringEnum = valueof(StringEnum);

    test('compatibility', () => {
        expectTypeOf(FromStringEnum.literal(StringEnum.One)).toEqualTypeOf<StringEnum>();
        expectTypeOf<StringEnum>().toEqualTypeOf<The<typeof FromStringEnum>>();
        expectTypeOf(FromStringEnum.literal(StringEnum.One)).toMatchTypeOf<'uno' | 'dos'>();
        // because TypeScript does not allow assigning correct literals to enum bindings
        expectTypeOf<'one'>().not.toMatchTypeOf<The<typeof FromStringEnum>>();
        expect(FromStringEnum('dos')).toBe('dos');
        expect(FromStringEnum.translate('dos')).toBe('Two');
    });
});
