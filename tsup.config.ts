import { defineConfig } from 'tsup';

const banner = `
/**
 * Runtime type-validation with derived TypeScript types.
 *
 * @packageDocumentation
 */
`;

export default defineConfig({
    entry: ['src/index.ts'],
    platform: 'neutral',
    format: ['cjs', 'esm'],
    tsconfig: 'tsconfig.lib.json',
    dts: {
        banner,
        compilerOptions: { composite: false },
    },
    sourcemap: true,
    clean: true,
});
