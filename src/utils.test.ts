import { bracketsIfNeeded, printValue } from './utils';

describe(printValue, () => {
    const circular = { nested: { prop: { value: 123, circular: 0 as unknown } } };
    circular.nested.prop.circular = circular;

    const veryLargeString = 'this is a very large string with too much words and characters and length and I just cannot stop typing now';

    test.each`
        input                                                                   | expected
        ${123}                                                                  | ${'123'}
        ${'123'}                                                                | ${'"123"'}
        ${Symbol('ok')}                                                         | ${'Symbol(ok)'}
        ${{ an: 'object', with: { nested: 'stuff' } }}                          | ${'{ an: "object", with: { nested: "stuff" } }'}
        ${{ 'difficult keys': true }}                                           | ${'{ "difficult keys": true }'}
        ${circular}                                                             | ${'{ nested: { prop: { value: 123, circular: [circular] } } }'}
        ${['a', ['b']]}                                                         | ${'["a", ["b"]]'}
        ${veryLargeString}                                                      | ${'"this is a very large .. nnot stop typing now"'}
        ${{ object: { with: veryLargeString }, and: { other: 'props' } }}       | ${'{ object: { with: "this is a very l ..  stop typing now" }, ..  }'}
        ${{ object: { with: veryLargeString } }}                                | ${'{ object: { with: "this is a very l ..  stop typing now" } }'}
        ${['array', 'with', ['a', veryLargeString]]}                            | ${'["array", "with", ["a", "this is a .. yping now"]]'}
        ${['array', 'with', ['a', veryLargeString, ['and'], 'other'], 'stuff']} | ${'["array", "with", ["a", "this is a .. yping now", .. ], .. ]'}
    `('correctly print: $expected', ({ input, expected }) => {
        expect(printValue(input)).toBe(expected);
    });
});

describe(bracketsIfNeeded, () => {
    test.each`
        input                  | output
        ${'a'}                 | ${'a'}
        ${'a b'}               | ${'(a b)'}
        ${'func(example ok)'}  | ${'func(example ok)'}
        ${'func (example ok)'} | ${'(func (example ok))'}
        ${'<a'}                | ${'(<a)'}
        ${'<<a>'}              | ${'(<<a>)'}
        ${'<<a>>'}             | ${'<<a>>'}
        ${'{ prop: value }'}   | ${'{ prop: value }'}
        ${'{a} {b}'}           | ${'({a} {b})'}
        ${'"{a} {b}"'}         | ${'"{a} {b}"'}
        ${'"{a} \\" {b}"'}     | ${'"{a} \\" {b}"'}
        ${'"{a} {b}'}          | ${'("{a} {b})'}
    `('bracketsIfNeeded($input) => $output', ({ input, output }) => {
        expect(bracketsIfNeeded(input)).toBe(output);
    });

    test.each`
        input      | output
        ${'a'}     | ${'a'}
        ${'a b'}   | ${'(a b)'}
        ${'a & b'} | ${'a & b'}
        ${'a | b'} | ${'(a | b)'}
    `('bracketsIfNeeded($input, "&") => $output', ({ input, output }) => {
        expect(bracketsIfNeeded(input, '&')).toBe(output);
    });

    test.each`
        input      | output
        ${'a'}     | ${'a'}
        ${'a b'}   | ${'(a b)'}
        ${'a & b'} | ${'(a & b)'}
        ${'a | b'} | ${'a | b'}
    `('bracketsIfNeeded($input, "|") => $output', ({ input, output }) => {
        expect(bracketsIfNeeded(input, '|')).toBe(output);
    });
});
