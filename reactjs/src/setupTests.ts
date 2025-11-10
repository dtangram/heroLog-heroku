import '@testing-library/jest-dom';

// Mock uuid globally
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234-5678-9012'),
  v1: jest.fn(() => 'mock-uuid-1234-5678-9012'),
  v3: jest.fn(() => 'mock-uuid-1234-5678-9012'),
  v5: jest.fn(() => 'mock-uuid-1234-5678-9012'),
}));

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};