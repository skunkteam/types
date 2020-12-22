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
            statements: 99,
            branches: 95,
            functions: 98,
            lines: 99,
        },
    },
};

module.exports = config;
