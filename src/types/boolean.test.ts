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
