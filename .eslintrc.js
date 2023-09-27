/** @type {import('eslint').Linter.Config} */
const config = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.lib.json', './tsconfig.test.json'],
    },
    plugins: ['@typescript-eslint', 'import'],
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/strict-type-checked', 'prettier'],
    rules: {
        'no-fallthrough': 'off', // checked by TS compiler
        'object-shorthand': ['error', 'always'],
        'sort-imports': ['error', { ignoreDeclarationSort: true }],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-invalid-void-type': 'off',
        '@typescript-eslint/no-throw-literal': 'off',
        'import/extensions': ['error', 'ignorePackages'],
    },
    overrides: [
        {
            files: ['*.test.ts'],
            rules: {
                '@typescript-eslint/no-unsafe-argument': 'off',
            },
        },
    ],
    reportUnusedDisableDirectives: true,
};
module.exports = config;
