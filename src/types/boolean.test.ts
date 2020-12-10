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
        [0, basicTypeMessage(boolean, 0)],
        [1, basicTypeMessage(boolean, 1)],
    ],
});

testTypeImpl({
    name: 'boolean.autoCast',
    type: boolean.autoCast,
    basicType: 'boolean',
    validValues: [true, false],
    invalidValues: [
        ['false', basicTypeMessage(boolean.autoCast, 'false')],
        [NaN, basicTypeMessage(boolean.autoCast, NaN)],
        [null, basicTypeMessage(boolean.autoCast, null)],
        [undefined, basicTypeMessage(boolean.autoCast, undefined)],
        [0, basicTypeMessage(boolean.autoCast, 0)],
        [1, basicTypeMessage(boolean.autoCast, 1)],
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
        [NaN, 'error in parser of [boolean.autoCast]: could not autocast value: NaN'],
        [null, 'error in parser of [boolean.autoCast]: could not autocast value: null'],
        [undefined, 'error in parser of [boolean.autoCast]: could not autocast value: undefined'],
    ],
});
