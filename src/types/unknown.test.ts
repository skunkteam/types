import { autoCast, autoCastAll } from '../autocast';
import { USUAL_SUSPECTS, basicTypeMessage, createExample, defaultUsualSuspects, testTypeImpl } from '../testutils';
import { unknown, unknownArray, unknownRecord } from './unknown';

testTypeImpl({
    name: 'unknown',
    type: unknown,
    basicType: 'mixed',
    validValues: ['', 'a real string', 123, ...USUAL_SUSPECTS, new Error(), []],
});

testTypeImpl({
    name: 'Record<string, unknown>',
    type: unknownRecord,
    basicType: 'object',
    validValues: [{}, { with: { some: 'content' } }, { [123]: Symbol() }, new Error()],
    invalidValues: [
        ['', basicTypeMessage(unknownRecord, '')],
        ['a real string', basicTypeMessage(unknownRecord, 'a real string')],
        [123, basicTypeMessage(unknownRecord, 123)],
        [[], basicTypeMessage(unknownRecord, [])],
        [['whatever'], basicTypeMessage(unknownRecord, ['whatever'])],
        ...defaultUsualSuspects(unknownRecord),
    ],
});

testTypeImpl({
    name: 'unknown[]',
    type: unknownArray,
    basicType: 'array',
    // wrap array inside array because of the use of jest.each in testTypeImpl
    validValues: [[[]], [[1, 2, 3]]],
    invalidValues: [
        [{}, basicTypeMessage(unknownArray, {})],
        ['', basicTypeMessage(unknownArray, '')],
        ['a real string', basicTypeMessage(unknownArray, 'a real string')],
        [123, basicTypeMessage(unknownArray, 123)],
        ...defaultUsualSuspects(unknownArray),
    ],
});

test('no autoCastAll', () => {
    expect(autoCastAll(unknown)).toBe(autoCast(unknown));
    expect(autoCastAll(unknownRecord)).toBe(autoCast(unknownRecord));
    expect(autoCastAll(unknownArray)).toBe(autoCast(unknownArray));
});

test('visitors', () => {
    expect(createExample(unknown)).toMatchInlineSnapshot(`"UNKNOWN"`);
    expect(createExample(unknownRecord)).toMatchInlineSnapshot(`
        {
          "unknown": "record",
        }
    `);
    expect(createExample(unknownArray)).toMatchInlineSnapshot(`
        [
          "unknown",
          "array",
        ]
    `);
});
