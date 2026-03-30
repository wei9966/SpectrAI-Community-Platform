import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Test environment configuration
const TEST_ENV = {
  PORT: 3000,
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://test:test@localhost:5432/test',
  JWT_SECRET: 'test-jwt-secret-key-for-testing',
  GITHUB_CLIENT_ID: 'test-github-client-id',
  GITHUB_CLIENT_SECRET: 'test-github-client-secret',
};

beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = TEST_ENV.DATABASE_URL;
  process.env.JWT_SECRET = TEST_ENV.JWT_SECRET;
  process.env.GITHUB_CLIENT_ID = TEST_ENV.GITHUB_CLIENT_ID;
  process.env.GITHUB_CLIENT_SECRET = TEST_ENV.GITHUB_CLIENT_SECRET;
});

afterAll(() => {
  // Cleanup after all tests
});

afterEach(() => {
  // Reset all mocks
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
