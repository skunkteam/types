import { reportError } from './error-reporter.js';
import { string, unknown } from './types/index.js';

describe(reportError, () => {
    const rootType = unknown.withName('RootType');
    const detailType = unknown.withName('DetailType');

    test.each`
        detail                                                                                             | msg
        ${{}}                                                                                              | ${'expected a [RootType], got: "input"'}
        ${{ path: ['property'] }}                                                                          | ${'error in [RootType] at <property>: expected a [DetailType], got: "input"'}
        ${{ kind: 'missing property', property: 'prop', type: detailType }}                                | ${'error in [RootType]: missing property <prop> [DetailType], got: "input"'}
        ${{ kind: 'invalid literal', expected: 123 }}                                                      | ${'expected the literal 123, got: "input"'}
        ${{ kind: 'invalid basic type', expected: 'number', expectedValue: 123 }}                          | ${'expected a number (123), got a string ("input")'}
        ${{ kind: 'invalid basic type', expected: 'undefined', expectedValue: undefined }}                 | ${'expected an undefined, got a string ("input")'}
        ${{ kind: 'invalid basic type', expected: 'null', expectedValue: null }}                           | ${'expected a null, got a string ("input")'}
        ${{ kind: 'invalid basic type', expected: 'undefined' }}                                           | ${'error in [RootType]: expected an undefined, got a string ("input")'}
        ${{ kind: 'invalid basic type', expected: 'null' }}                                                | ${'error in [RootType]: expected a null, got a string ("input")'}
        ${{ kind: 'invalid literal', expected: [123, false, 'q'] }}                                        | ${'error in [RootType]: expected one of the literals 123, false or "q", got: "input"'}
        ${{ kind: 'custom message', message: 'blabla' }}                                                   | ${'error in [RootType]: blabla, got: "input"'}
        ${{ kind: 'custom message', message: 'blabla', omitInput: true }}                                  | ${'error in [RootType]: blabla'}
        ${{ kind: 'length out of range', violation: 'minLength', config: {} }}                             | ${'error in [RootType]: number of elements out of range, got: "input"'}
        ${{ kind: 'length out of range', violation: 'maxLength', config: {} }}                             | ${'error in [RootType]: number of elements out of range, got: "input"'}
        ${{ kind: 'length out of range', violation: 'minLength', config: { minLength: 1 } }}               | ${'error in [RootType]: expected at least 1 element, got: "input"'}
        ${{ kind: 'length out of range', violation: 'maxLength', config: { maxLength: 4 } }}               | ${'error in [RootType]: expected at most 4 elements, got: "input"'}
        ${{ kind: 'length out of range', violation: 'minLength', type: string, config: {} }}               | ${'error in [RootType]: number of characters out of range, got: "input"'}
        ${{ kind: 'length out of range', violation: 'maxLength', type: string, config: {} }}               | ${'error in [RootType]: number of characters out of range, got: "input"'}
        ${{ kind: 'length out of range', violation: 'minLength', type: string, config: { minLength: 1 } }} | ${'error in [RootType]: expected at least 1 character, got: "input"'}
        ${{ kind: 'length out of range', violation: 'maxLength', type: string, config: { maxLength: 4 } }} | ${'error in [RootType]: expected at most 4 characters, got: "input"'}
        ${{ kind: 'pattern mismatch', config: {} }}                                                        | ${'error in [RootType]: input does not match expected pattern, got: "input"'}
        ${{ kind: 'pattern mismatch', config: { pattern: /the pattern/ } }}                                | ${'error in [RootType]: expected a string matching pattern /the pattern/, got: "input"'}
        ${{ kind: 'input out of range', violation: 'max', config: {} }}                                    | ${'error in [RootType]: input too high, got: "input"'}
        ${{ kind: 'input out of range', violation: 'max', config: { max: 0 } }}                            | ${'error in [RootType]: expected a non-positive number, got: "input"'}
        ${{ kind: 'input out of range', violation: 'max', config: { maxExclusive: 0 } }}                   | ${'error in [RootType]: expected a negative number, got: "input"'}
        ${{ kind: 'input out of range', violation: 'max', config: { max: 1 } }}                            | ${'error in [RootType]: expected the number 1 or less, got: "input"'}
        ${{ kind: 'input out of range', violation: 'max', config: { maxExclusive: 1 } }}                   | ${'error in [RootType]: expected a number less than 1, got: "input"'}
        ${{ kind: 'input out of range', violation: 'min', config: {} }}                                    | ${'error in [RootType]: input too low, got: "input"'}
        ${{ kind: 'input out of range', violation: 'min', config: { min: 0 } }}                            | ${'error in [RootType]: expected a non-negative number, got: "input"'}
        ${{ kind: 'input out of range', violation: 'min', config: { minExclusive: 0 } }}                   | ${'error in [RootType]: expected a positive number, got: "input"'}
        ${{ kind: 'input out of range', violation: 'min', config: { min: 1 } }}                            | ${'error in [RootType]: expected the number 1 or greater, got: "input"'}
        ${{ kind: 'input out of range', violation: 'min', config: { minExclusive: 1 } }}                   | ${'error in [RootType]: expected a number greater than 1, got: "input"'}
        ${{ kind: 'input out of range', violation: 'multipleOf', config: {} }}                             | ${'error in [RootType]: violated an unknown "multipleOf" rule, got: "input"'}
        ${{ kind: 'input out of range', violation: 'multipleOf', config: { multipleOf: 1 } }}              | ${'error in [RootType]: expected a whole number, got: "input"'}
        ${{ kind: 'input out of range', violation: 'multipleOf', config: { multipleOf: 2 } }}              | ${'error in [RootType]: expected a multiple of 2, got: "input"'}
    `('single detail: $detail', ({ detail, msg }) => {
        expect(
            reportError({
                ok: false,
                type: rootType,
                input: 'root input',
                details: [{ type: 'path' in detail ? detailType : rootType, input: 'input', ...detail }],
            }),
        ).toBe(msg);
    });
});
