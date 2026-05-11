/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@engine/(.*)$': '<rootDir>/src/engine/$1',
    '^@simulation/(.*)$': '<rootDir>/src/simulation/$1',
    '^@analysis/(.*)$': '<rootDir>/src/analysis/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },
};
