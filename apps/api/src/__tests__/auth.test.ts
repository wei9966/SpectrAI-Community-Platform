import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { sign } from 'jsonwebtoken';
import { hash, compare } from 'bcryptjs';

// Mock the database module
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

// Mock users table
const mockUsers = [
  {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: '',
    avatarUrl: null,
    githubId: null,
    bio: null,
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Create a password hash for testing
const TEST_PASSWORD = 'SecurePassword123!';
let testUserWithHash: typeof mockUsers[0];

beforeAll(async () => {
  testUserWithHash = {
    ...mockUsers[0],
    passwordHash: await hash(TEST_PASSWORD, 12),
  };
});

// Mock env
const mockEnv = {
  PORT: 3000,
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://test:test@localhost:5432/test',
  JWT_SECRET: 'test-jwt-secret-key-for-testing',
  GITHUB_CLIENT_ID: 'test-github-client-id',
  GITHUB_CLIENT_SECRET: 'test-github-client-secret',
};

// Mock getEnv
vi.mock('../config/env.js', () => ({
  getEnv: () => mockEnv,
}));

// Mock db
vi.mock('../db/index.js', () => ({
  db: mockDb,
}));

// Mock users schema
vi.mock('../db/schema.js', () => ({
  users: {},
}));

// Import auth routes after mocking
import authRoutes from '../routes/auth.js';

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register a new user with valid credentials', async () => {
    const mockNewUser = {
      id: 'new-user-id',
      username: 'newuser',
      email: 'newuser@example.com',
      passwordHash: await hash('Password123!', 12),
      avatarUrl: null,
      githubId: null,
      bio: null,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock: no existing user, then insert new user
    mockDb.select.mockReturnValueOnce({ where: () => Promise.resolve([]) }); // email check
    mockDb.select.mockReturnValueOnce({ where: () => Promise.resolve([]) }); // username check
    mockDb.insert.mockReturnValue({ values: () => Promise.resolve({ returning: () => Promise.resolve([mockNewUser]) }) });

    const app = new Hono();
    app.route('/api/auth', authRoutes);

    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'Password123!',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('token');
    expect(body.data).toHaveProperty('user');
    expect(body.data.user.username).toBe('newuser');
    expect(body.data.user).not.toHaveProperty('passwordHash');
  });

  it('should reject registration with existing email', async () => {
    mockDb.select.mockReturnValueOnce({ where: () => Promise.resolve([testUserWithHash]) });

    const app = new Hono();
    app.route('/api/auth', authRoutes);

    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'differentuser',
        email: 'test@example.com',
        password: 'Password123!',
      }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Email already registered');
  });

  it('should reject registration with existing username', async () => {
    mockDb.select
      .mockReturnValueOnce({ where: () => Promise.resolve([]) }) // email check passes
      .mockReturnValueOnce({ where: () => Promise.resolve([testUserWithHash]) }); // username exists

    const app = new Hono();
    app.route('/api/auth', authRoutes);

    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        email: 'different@example.com',
        password: 'Password123!',
      }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Username already taken');
  });

  it('should reject registration with invalid email format', async () => {
    const app = new Hono();
    app.route('/api/auth', authRoutes);

    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'validuser',
        email: 'not-an-email',
        password: 'Password123!',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('should reject registration with password less than 8 characters', async () => {
    const app = new Hono();
    app.route('/api/auth', authRoutes);

    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'validuser',
        email: 'valid@example.com',
        password: 'short',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('should reject registration with username containing special characters', async () => {
    const app = new Hono();
    app.route('/api/auth', authRoutes);

    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'invalid@user!',
        email: 'valid@example.com',
        password: 'Password123!',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('should reject registration with username less than 3 characters', async () => {
    const app = new Hono();
    app.route('/api/auth', authRoutes);

    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'ab',
        email: 'valid@example.com',
        password: 'Password123!',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should login with valid credentials', async () => {
    mockDb.select.mockReturnValue({ where: () => Promise.resolve([testUserWithHash]) });

    const app = new Hono();
    app.route('/api/auth', authRoutes);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: TEST_PASSWORD,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('token');
    expect(body.data).toHaveProperty('user');
    expect(body.data.user.username).toBe('testuser');
  });

  it('should reject login with incorrect password', async () => {
    mockDb.select.mockReturnValue({ where: () => Promise.resolve([testUserWithHash]) });

    const app = new Hono();
    app.route('/api/auth', authRoutes);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'WrongPassword!',
      }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Invalid email or password');
  });

  it('should reject login with non-existent email', async () => {
    mockDb.select.mockReturnValue({ where: () => Promise.resolve([]) });

    const app = new Hono();
    app.route('/api/auth', authRoutes);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'SomePassword!',
      }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Invalid email or password');
  });

  it('should reject login with empty email', async () => {
    const app = new Hono();
    app.route('/api/auth', authRoutes);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '',
        password: 'SomePassword!',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('should reject login with empty password', async () => {
    const app = new Hono();
    app.route('/api/auth', authRoutes);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: '',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('should not expose passwordHash in response', async () => {
    mockDb.select.mockReturnValue({ where: () => Promise.resolve([testUserWithHash]) });

    const app = new Hono();
    app.route('/api/auth', authRoutes);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: TEST_PASSWORD,
      }),
    });

    const body = await res.json();
    expect(body.data.user).not.toHaveProperty('passwordHash');
    expect(body.data.user).not.toHaveProperty('password');
  });
});

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return current user with valid JWT token', async () => {
    const token = sign(
      { userId: 'user-1', username: 'testuser', role: 'user' },
      mockEnv.JWT_SECRET,
      { expiresIn: '7d' }
    );

    mockDb.select.mockReturnValue({ where: () => Promise.resolve([mockUsers[0]]) });

    const app = new Hono();
    app.route('/api/auth', authRoutes);

    const res = await app.request('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.username).toBe('testuser');
  });

  it('should reject request without authorization header', async () => {
    const app = new Hono();
    app.route('/api/auth', authRoutes);

    const res = await app.request('/api/auth/me');

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Authentication required');
  });

  it('should reject request with invalid JWT token', async () => {
    const app = new Hono();
    app.route('/api/auth', authRoutes);

    const res = await app.request('/api/auth/me', {
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Invalid or expired token');
  });

  it('should reject request with malformed authorization header', async () => {
    const app = new Hono();
    app.route('/api/auth', authRoutes);

    const res = await app.request('/api/auth/me', {
      headers: {
        Authorization: 'InvalidFormat token',
      },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('should reject request with expired JWT token', async () => {
    const token = sign(
      { userId: 'user-1', username: 'testuser', role: 'user' },
      mockEnv.JWT_SECRET,
      { expiresIn: '-1s' } // Already expired
    );

    const app = new Hono();
    app.route('/api/auth', authRoutes);

    const res = await app.request('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});

describe('Auth Response Format', () => {
  it('should return ApiResponse format on successful auth', async () => {
    mockDb.select.mockReturnValue({ where: () => Promise.resolve([testUserWithHash]) });

    const app = new Hono();
    app.route('/api/auth', authRoutes);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: TEST_PASSWORD,
      }),
    });

    const body = await res.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('token');
    expect(body.data).toHaveProperty('user');
    expect(body.data.user).toHaveProperty('id');
    expect(body.data.user).toHaveProperty('username');
    expect(body.data.user).toHaveProperty('email');
  });

  it('should return error format on failed auth', async () => {
    mockDb.select.mockReturnValue({ where: () => Promise.resolve([]) });

    const app = new Hono();
    app.route('/api/auth', authRoutes);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'SomePassword!',
      }),
    });

    const body = await res.json();
    expect(body).toHaveProperty('success', false);
    expect(body).toHaveProperty('error');
    expect(body).not.toHaveProperty('data');
  });
});
