import 'reflect-metadata';
import { int } from './types/index.js';

describe('compatibility with TypeScript decorator metadata', () => {
    const decorator: MethodDecorator = () => undefined;

    class Container {
        @decorator
        method(s: int): int {
            return s;
        }
    }

    test('should pass TS checks to be included as metadata', () => {
        expect(Reflect.getMetadata('design:paramtypes', Container.prototype, 'method')).toEqual([int]);
        expect(Reflect.getMetadata('design:returntype', Container.prototype, 'method')).toBe(int);
    });
});
