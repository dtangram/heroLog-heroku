// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only-minimum-32-characters-long';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-api-key-for-testing';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/herolog_test';

// Increase timeout for database operations
jest.setTimeout(10000);

// Suppress console logs in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};