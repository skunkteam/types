import { VERSION } from './index';

describe('static const', () => {
    test('VERSION', () => {
        expect(VERSION).toBe('1.0.0');
    });
});
