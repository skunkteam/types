import type { The } from './interfaces';
import { SimpleType } from './simple-type';
import { createExample } from './testutils';
import { object } from './types/interface';

describe(SimpleType, () => {
    test('create simple types with ease', () => {
        const BufferType = SimpleType.create<Buffer>('Buffer', 'object', v => Buffer.isBuffer(v));

        const buffer = Buffer.alloc(0);
        expect(BufferType(buffer)).toBe(buffer);
        expect(() => BufferType([])).toThrow(`expected a [Buffer], got: []`);
        expect(() => BufferType(Uint8Array.of(1, 2, 3))).toThrow(`expected a [Buffer], got: "1,2,3"`);

        // Visitors also work with custom types:
        const Combination = object({ buffer: BufferType });
        Object.assign(BufferType, { example: Buffer.from('xx') });
        expect(createExample(Combination)).toMatchInlineSnapshot(`
            {
              "buffer": {
                "data": [
                  120,
                  120,
                ],
                "type": "Buffer",
              },
            }
        `);
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

    test('has basic support for stringify', () => {
        const DefaultBufferType = SimpleType.create<Buffer>('Buffer', 'object', v => Buffer.isBuffer(v));

        const buffer = Buffer.from('some text', 'utf8');
        expect(() => DefaultBufferType.stringify(buffer)).toThrow('stringify not supported on type Buffer');

        const BufferTypeWithStringify = SimpleType.create<Buffer>('Buffer', 'object', v => Buffer.isBuffer(v), {
            maybeStringify: buf => JSON.stringify(buf.toString()),
        });
        expect(BufferTypeWithStringify.stringify(buffer)).toBe('"some text"');

        // Also works nested:
        type NestedBuffer = The<typeof NestedBuffer>;
        const NestedBuffer = object({ buffer: BufferTypeWithStringify });
        const value: NestedBuffer = { buffer };
        expect(NestedBuffer.stringify(value)).toBe('{"buffer":"some text"}');
    });
});
