/** @type {import('eslint').Linter.Config} */
const config = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.lib.json', './tsconfig.test.json'],
    },
    plugins: ['@typescript-eslint', 'import'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'prettier',
    ],
    rules: {
        'no-fallthrough': 'off', // checked by TS compiler
        'object-shorthand': ['error', 'always'],
        'sort-imports': ['error', { ignoreCase: true, ignoreDeclarationSort: true }],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'import/extensions': ['error', 'ignorePackages'],
    },
};
module.exports = config;
