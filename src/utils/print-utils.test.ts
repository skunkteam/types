/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { an, bracketsIfNeeded, printValue } from './print-utils';

describe(printValue, () => {
    const circular = { nested: { prop: { value: 123, circular: 0 as unknown } } };
    circular.nested.prop.circular = circular;

    const veryLargeString = 'this is a very large string with too much words and characters and length and I just cannot stop typing now';
    function aVeryLargeFunction() {
        // NOP
    }

    test.each`
        input                                                                   | normal                                                          | verySmall
        ${123}                                                                  | ${'123'}                                                        | ${null}
        ${'123'}                                                                | ${'"123"'}                                                      | ${null}
        ${Symbol()}                                                             | ${'[Symbol]'}                                                   | ${'[Symbol]'}
        ${Symbol('this is my symbol')}                                          | ${'[Symbol: this is my symbol]'}                                | ${'[Symbol: t .. l]'}
        ${{ an: 'object', with: { nested: 'stuff' } }}                          | ${'{ an: "object", with: { nested: "stuff" } }'}                | ${'{ .. }'}
        ${{ 'difficult keys': true }}                                           | ${'{ "difficult keys": true }'}                                 | ${'{ .. }'}
        ${circular}                                                             | ${'{ nested: { prop: { value: 123, circular: [circular] } } }'} | ${'{ .. }'}
        ${['a', ['b']]}                                                         | ${'["a", ["b"]]'}                                               | ${'[..]'}
        ${veryLargeString}                                                      | ${'"this is a very large .. nnot stop typing now"'}             | ${'" .. "'}
        ${{ object: { with: veryLargeString }, and: { other: 'props' } }}       | ${'{ object: { with: "this is a .. yping now" }, .. }'}         | ${'{ .. }'}
        ${{ object: { with: veryLargeString } }}                                | ${'{ object: { with: "this is a .. yping now" } }'}             | ${'{ .. }'}
        ${['array', 'with', ['a', veryLargeString]]}                            | ${'["array", "with", ["a", "this is a .. yping now"]]'}         | ${'[..]'}
        ${['array', 'with', ['a', veryLargeString, ['and'], 'other'], 'stuff']} | ${'["array", "with", ["a", "this is a .. yping now", ..], ..]'} | ${'[..]'}
        ${aVeryLargeFunction}                                                   | ${'[Function: aVeryLargeFunction]'}                             | ${'[Function: a .. n]'}
    `('correctly print: $normal', ({ input, normal, verySmall }) => {
        expect(printValue(input)).toBe(normal);
        expect(printValue(input, 2)).toBe(verySmall || normal);
    });
});

describe(bracketsIfNeeded, () => {
    test.each`
        input                          | output
        ${'a'}                         | ${'a'}
        ${'a b'}                       | ${'(a b)'}
        ${'func(example ok)'}          | ${'func(example ok)'}
        ${'func (example ok)'}         | ${'(func (example ok))'}
        ${'<a'}                        | ${'(<a)'}
        ${'<<a>'}                      | ${'(<<a>)'}
        ${'<<a>>'}                     | ${'<<a>>'}
        ${'{ prop: value }'}           | ${'{ prop: value }'}
        ${'{ prop: value }.autoCast'}  | ${'({ prop: value }.autoCast)'}
        ${'AutoCast<{ prop: value }>'} | ${'AutoCast<{ prop: value }>'}
        ${'{a} {b}'}                   | ${'({a} {b})'}
        ${'"{a} {b}"'}                 | ${'"{a} {b}"'}
        ${'"{a} \\" {b}"'}             | ${'"{a} \\" {b}"'}
        ${'"{a} {b}'}                  | ${'("{a} {b})'}
    `('bracketsIfNeeded($input) => $output', ({ input, output }) => {
        expect(bracketsIfNeeded(input)).toBe(output);
    });

    test.each`
        input        | output
        ${'a'}       | ${'a'}
        ${'a b'}     | ${'(a b)'}
        ${'a & b'}   | ${'a & b'}
        ${'a | b'}   | ${'(a | b)'}
        ${'a &| b'}  | ${'(a &| b)'}
        ${'a & | b'} | ${'(a & | b)'}
    `('bracketsIfNeeded($input, "&") => $output', ({ input, output }) => {
        expect(bracketsIfNeeded(input, '&')).toBe(output);
    });

    test.each`
        input        | output
        ${'a'}       | ${'a'}
        ${'a b'}     | ${'(a b)'}
        ${'a & b'}   | ${'(a & b)'}
        ${'a | b'}   | ${'a | b'}
        ${'a |& b'}  | ${'(a |& b)'}
        ${'a | & b'} | ${'(a | & b)'}
    `('bracketsIfNeeded($input, "|") => $output', ({ input, output }) => {
        expect(bracketsIfNeeded(input, '|')).toBe(output);
    });

    test.each`
        input          | output
        ${'a'}         | ${'a'}
        ${'a b'}       | ${'(a b)'}
        ${'a & b'}     | ${'a & b'}
        ${'a | b'}     | ${'a | b'}
        ${'a & b | c'} | ${'a & b | c'}
        ${'a |& b'}    | ${'(a |& b)'}
        ${'a | & b'}   | ${'(a | & b)'}
    `('bracketsIfNeeded($input, "|") => $output', ({ input, output }) => {
        expect(bracketsIfNeeded(input, '|', '&')).toBe(output);
    });
});

describe(an, () => {
    test.each([
        // Special cases
        'an euler formula',
        'an hour',
        'a houri',
        'an honour',
        'an honest thief',

        // Single letter words
        'a U-boat',
        'a Y thingy',

        // Abbreviations
        'an A.B.C.',
        'a B.Y.O.D.',

        // Consonants
        'a motor',
        'a boat',

        // Special vowel-forms
        'a eulogy',
        'a once great nation',
        'a university',
        'a unimodal distribution',
        'an unimaginable set of rules',
        'an utterance',
        'a ubiquity',
        'a UFO',
        'a uranium isotope',

        // Vowels
        'an ugly truth',
        'an island',
        'an original thought',

        // Handle 'y'...
        'a year',
        'an Yggdrasil',
        'an ypsilon',
        'a yoctometer',

        // ...
        'an exhausted programmer',
    ])('produce %j', s => {
        const [, a, word] = /^(a|an) (.*)$/.exec(s)!;
        expect(an(word)).toBe(s);
        expect(an(`[${word}]`)).toBe(`${a} [${word}]`);
        expect(an(`<<<${word}>>>`)).toBe(`${a} <<<${word}>>>`);
    });
});
