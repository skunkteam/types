import { autoCast, autoCastAll } from '../autocast';
import { basicTypeMessage, testTypeImpl } from '../testutils';
import { boolean } from './boolean';

testTypeImpl({
    name: 'boolean',
    type: boolean,
    basicType: 'boolean',
    validValues: [true, false],
    invalidValues: [
        ['false', basicTypeMessage(boolean, 'false')],
        [NaN, basicTypeMessage(boolean, NaN)],
        [null, basicTypeMessage(boolean, null)],
        [undefined, basicTypeMessage(boolean, undefined)],
        [[true], basicTypeMessage(boolean, [true])],
        [[], basicTypeMessage(boolean, [])],
        [0, basicTypeMessage(boolean, 0)],
        [1, basicTypeMessage(boolean, 1)],
    ],
});

testTypeImpl({
    name: 'AutoCast<boolean>',
    type: autoCast(boolean),
    basicType: 'boolean',
    validValues: [true, false],
    invalidValues: [
        ['false', basicTypeMessage(autoCast(boolean), 'false')],
        [NaN, basicTypeMessage(autoCast(boolean), NaN)],
        [null, basicTypeMessage(autoCast(boolean), null)],
        [undefined, basicTypeMessage(autoCast(boolean), undefined)],
        [0, basicTypeMessage(autoCast(boolean), 0)],
        [1, basicTypeMessage(autoCast(boolean), 1)],
    ],
    validConversions: [
        ['false', false],
        ['true', true],
        [false, false],
        [true, true],
        [0, false],
        [1, true],
    ],
    invalidConversions: [
        [NaN, 'error in parser of [AutoCast<boolean>]: could not autocast value: NaN'],
        [null, 'error in parser of [AutoCast<boolean>]: could not autocast value: null'],
        [undefined, 'error in parser of [AutoCast<boolean>]: could not autocast value: undefined'],
    ],
});

test('no autoCastAll', () => {
    expect(autoCastAll(boolean)).toBe(autoCast(boolean));
});
