/** @typedef {import('ts-jest/dist/types')} */
/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    setupFilesAfterEnv: ['jest-extended/all'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
    },
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.ts', '!src/index.ts', '!src/testutils.ts'],
    restoreMocks: true,
    coverageThreshold: {
        global: {
            statements: -4,
            branches: -21,
            functions: -2,
            lines: 100,
        },
    },
    moduleNameMapper: { '^(.*)\\.js$': ['$1.js', '$1.ts'] },
};

module.exports = config;
