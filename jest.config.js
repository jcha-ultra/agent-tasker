/*
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/en/configuration.html
 */

module.exports = {
    setupFiles: [
        '<rootDir>/tests/setup.jest.js'
    ],
    testEnvironment: 'node',
    slowTestThreshold: 120000, // Two minutes
    testTimeout: 300000, // Five minutes
};
