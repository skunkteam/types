/** @typedef {import('ts-jest/dist/types')} */
/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    setupFilesAfterEnv: ['jest-extended'],
    globals: { 'ts-jest': { tsconfig: '<rootDir>/tsconfig.test.json' } },
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.ts', '!src/index.ts', '!src/testutils.ts'],
    restoreMocks: true,
    coverageThreshold: {
        global: {
            statements: 96,
            branches: 92,
            functions: 97,
            lines: 98,
        },
    },
};

module.exports = config;
