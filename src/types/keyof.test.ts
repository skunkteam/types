import type { The } from '../interfaces.js';
import { ValidationErrorForTest, assignableTo, basicTypeMessage, defaultUsualSuspects, testTypeImpl, testTypes } from '../testutils.js';
import { keyof, valueof } from './keyof.js';
import { literal } from './literal.js';
import { union } from './union.js';

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
    name: '("0" | "1").autoCast',
    type: keyof({ 0: 0, 1: 1 }).autoCast,
    basicType: 'string',
    validValues: ['0', '1'],
    invalidValues: [[0, basicTypeMessage(keyof({ 0: 0, 1: 1 }).autoCast, 0)]],
    validConversions: [
        [0, '0'],
        [1, '1'],
    ],
    invalidConversions: [
        ['a', 'error in [("0" | "1").autoCast]: expected one of the literals "0" or "1", got: "a"'],
        [2, 'error in [("0" | "1").autoCast]: expected one of the literals "0" or "1", got: "2", parsed from: 2'],
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

    testTypes(() => {
        assignableTo<YourAnswer>('yes');
        assignableTo<YourAnswer>('no');
        assignableTo<YourAnswer>('maybe');
        assignableTo<'yes' | 'no' | 'maybe'>(YourAnswer(0));

        type AsUnion = The<typeof AsUnion>;
        const AsUnion = union([literal('maybe'), literal('yes'), literal('no')]);
        assignableTo<AsUnion>(YourAnswer(0));
        assignableTo<YourAnswer>(AsUnion(0));

        const translated = YourAnswer.translate(0);
        assignableTo<'trouble' | boolean>(translated);
        assignableTo<typeof translated>('trouble');
        assignableTo<typeof translated>(false);
        assignableTo<typeof translated>(true);
    });
});

describe(valueof, () => {
    enum StringEnum {
        One = 'uno',
        Two = 'dos',
    }
    const FromStringEnum = valueof(StringEnum);

    test('compatibility', () => {
        assignableTo<'uno' | 'dos'>(FromStringEnum('uno'));
        assignableTo<The<typeof FromStringEnum>>(StringEnum.One);
        // @ts-expect-error because TypeScript does not allow assigning correct literals to enum bindings
        assignableTo<The<typeof FromStringEnum>>('one');
        expect(FromStringEnum('dos')).toBe('dos');
        expect(FromStringEnum.translate('dos')).toBe('Two');
    });
});
