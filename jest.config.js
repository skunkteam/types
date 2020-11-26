/** @typedef {import('ts-jest/dist/types')} */
/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    setupFilesAfterEnv: ['jest-extended'],
    globals: { 'ts-jest': { tsconfig: '<rootDir>/tsconfig.test.json' } },
};

module.exports = config;
