import { SimpleType } from './simple-type.js';

describe(SimpleType, () => {
    test('create simple types with ease', () => {
        const BufferType = SimpleType.create<Buffer>('Buffer', 'object', v => Buffer.isBuffer(v));

        const buffer = Buffer.alloc(0);
        expect(BufferType(buffer)).toBe(buffer);
        expect(() => BufferType([])).toThrow(`expected a [Buffer], got: []`);
        expect(() => BufferType(Uint8Array.of(1, 2, 3))).toThrow(`expected a [Buffer], got: "1,2,3"`);
    });

    test('create simple types with ease with autoCast', () => {
        const BufferType = SimpleType.create<Buffer>('Buffer', 'object', v => Buffer.isBuffer(v), {
            autoCaster: i => (i instanceof Uint8Array ? Buffer.from(i) : i),
        });

        const buffer = Buffer.alloc(0);
        expect(BufferType(buffer)).toBe(buffer);
        expect(() => BufferType([])).toThrow(`expected a [Buffer], got: []`);
        expect(() => BufferType(Uint8Array.of(1, 2, 3))).toThrow(`expected a [Buffer], got: "1,2,3"`);
        expect(BufferType.autoCast(Uint8Array.of(1, 2, 3))).toEqual(Buffer.of(1, 2, 3));
    });
});
