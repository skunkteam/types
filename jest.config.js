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
            statements: -3,
            branches: -15,
            functions: -1,
            lines: 100,
        },
    },
    moduleNameMapper: { '^(.*)\\.js$': ['$1.js', '$1.ts'] },
    // Until we upgrade Jest to v30, which supports prettier v3
    prettierPath: require.resolve('prettier-2'),
};

module.exports = config;
