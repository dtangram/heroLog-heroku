module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/app'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json'
    }],
  },
  collectCoverageFrom: [
    'app/**/*.ts',
    '!app/**/*.d.ts',
    '!app/models/**',
  ],
  coverageDirectory: 'coverage',
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testTimeout: 10000,
};