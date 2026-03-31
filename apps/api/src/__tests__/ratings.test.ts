import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { Hono } from 'hono';
import { sign } from 'jsonwebtoken';
import { hash } from 'bcryptjs';

// Mock env
const mockEnv = {
  PORT: 3000,
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://test:test@localhost:5432/test',
  JWT_SECRET: 'test-jwt-secret-key-for-testing',
  GITHUB_CLIENT_ID: 'test-github-client-id',
  GITHUB_CLIENT_SECRET: 'test-github-client-secret',
};

// Mock db helper - creates a chainable mock query builder that returns promises
const createMockQueryBuilder = () => {
  const mock: any = {};
  // Terminal methods return promises that can be mocked
  mock.where = vi.fn(() => mock);
  mock.limit = vi.fn(async () => []);
  mock.offset = vi.fn(async () => []);
  mock.orderBy = vi.fn(() => mock);
  mock.innerJoin = vi.fn(() => mock);
  mock.leftJoin = vi.fn(() => mock);
  mock.returning = vi.fn(async () => []);
  mock.values = vi.fn(() => mock);
  mock.set = vi.fn(() => mock);
  mock.from = vi.fn(() => mock);
  // Chainable methods return mock for chaining
  mock.where.mockReturnThis();
  mock.orderBy.mockReturnThis();
  mock.innerJoin.mockReturnThis();
  mock.leftJoin.mockReturnThis();
  mock.values.mockReturnThis();
  mock.set.mockReturnThis();
  mock.from.mockReturnThis();
  return mock;
};

// Mock modules - vi.mock is hoisted, must define everything inside factory
vi.mock('../config/env.js', () => ({
  getEnv: () => mockEnv,
}));

vi.mock('../db/index.js', () => {
  const mockDb: any = {
    select: vi.fn(() => createMockQueryBuilder()),
    insert: vi.fn(() => createMockQueryBuilder()),
    update: vi.fn(() => createMockQueryBuilder()),
    delete: vi.fn(() => createMockQueryBuilder()),
  };
  return {
    db: mockDb,
  };
});

vi.mock('../db/schema.js', () => ({
  users: {},
  resources: {},
  resourceLikes: {},
  resourceComments: {},
  resourceRatings: {},
  resourceFavorites: {},
}));

// Import after mocking
import ratingRoutes from '../routes/ratings.js';
import { db } from '../db/index.js';

// Mock data
const mockUsers = [
  {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: '',
    avatarUrl: null,
    githubId: null,
    bio: null,
    role: 'user' as const,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
];

const mockResources = [
  {
    id: 'resource-1',
    name: 'Test Resource',
    description: 'A test resource',
    type: 'workflow' as const,
    content: {},
    authorId: 'user-1',
    downloads: 100,
    likes: 50,
    tags: ['test', 'workflow'],
    version: '1.0.0',
    isPublished: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
];

const mockRatings = [
  {
    id: 'rating-1',
    resourceId: 'resource-1',
    userId: 'user-1',
    rating: 5,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
];

// Test factory functions
function createMockRating(overrides?: Partial<typeof mockRatings[0]>) {
  return { ...mockRatings[0], ...overrides };
}

function generateTestToken(userId: string, role = 'user') {
  return sign(
    { userId, username: 'testuser', role },
    mockEnv.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Get mock db after mocking
const mockDb = db as any;

describe('ratingRoutes', () => {
  let app: Hono;
  let validToken: string;

  beforeAll(async () => {
    const testUser = { ...mockUsers[0], passwordHash: await hash('Password123!', 12) };
    mockUsers[0] = testUser;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/api/resources', ratingRoutes);
    validToken = generateTestToken('user-1');
  });

  describe('POST /api/resources/:id/rate', () => {
    describe('authentication', () => {
      it('should reject rating without authentication', async () => {
        const res = await app.request('/api/resources/resource-1/rate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: 5 }),
        });

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.success).toBe(false);
      });

      it('should reject rating with invalid token', async () => {
        const res = await app.request('/api/resources/resource-1/rate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer invalid-token',
          },
          body: JSON.stringify({ rating: 5 }),
        });

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.success).toBe(false);
      });
    });

    describe('validation', () => {
      it('should reject rating without rating field', async () => {
        const res = await app.request('/api/resources/resource-1/rate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({}),
        });

        expect(res.status).toBe(400);
      });

      it('should reject rating below minimum (0)', async () => {
        const res = await app.request('/api/resources/resource-1/rate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ rating: 0 }),
        });

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.success).toBe(false);
      });

      it('should reject rating above maximum (6)', async () => {
        const res = await app.request('/api/resources/resource-1/rate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ rating: 6 }),
        });

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.success).toBe(false);
      });

      it('should reject non-integer rating', async () => {
        const res = await app.request('/api/resources/resource-1/rate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ rating: 3.5 }),
        });

        expect(res.status).toBe(400);
      });

      it('should reject string rating', async () => {
        const res = await app.request('/api/resources/resource-1/rate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ rating: '5' }),
        });

        expect(res.status).toBe(400);
      });
    });

    describe('resource existence', () => {
      it('should reject rating for non-existent resource', async () => {
        mockDb.select().from().where().limit.mockResolvedValueOnce([]);

        const res = await app.request('/api/resources/non-existent/rate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ rating: 5 }),
        });

        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.error).toBe('Resource not found');
      });
    });

    describe('successful rating', () => {
      it('should create a new rating (minimum value: 1)', async () => {
        // Create fresh query builder mocks for each call chain
        const firstCallMock = createMockQueryBuilder();
        const secondCallMock = createMockQueryBuilder();
        const thirdCallMock = createMockQueryBuilder();

        // Setup: first select() call - check resource exists
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit.mockResolvedValueOnce([mockResources[0]]);

        // Setup: second select() call - check existing rating
        (mockDb.select as any).mockReturnValueOnce(secondCallMock);
        secondCallMock.from.mockReturnValueOnce(secondCallMock);
        secondCallMock.where.mockReturnValueOnce(secondCallMock);
        secondCallMock.limit.mockResolvedValueOnce([]);

        // Setup: insert call
        const insertMock = createMockQueryBuilder();
        (mockDb.insert as any).mockReturnValueOnce(insertMock);
        insertMock.values.mockReturnValueOnce(insertMock);
        insertMock.returning.mockResolvedValueOnce([createMockRating({ rating: 1 })]);

        // Setup: third select() call - get stats
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockResolvedValueOnce([{ averageRating: '1', ratingCount: 1 }]);

        const res = await app.request('/api/resources/resource-1/rate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ rating: 1 }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.rating).toBe(1);
        expect(body.data).toHaveProperty('averageRating');
        expect(body.data).toHaveProperty('ratingCount');
      });

      it('should create a new rating (maximum value: 5)', async () => {
        const firstCallMock = createMockQueryBuilder();
        const secondCallMock = createMockQueryBuilder();
        const thirdCallMock = createMockQueryBuilder();

        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit.mockResolvedValueOnce([mockResources[0]]);

        (mockDb.select as any).mockReturnValueOnce(secondCallMock);
        secondCallMock.from.mockReturnValueOnce(secondCallMock);
        secondCallMock.where.mockReturnValueOnce(secondCallMock);
        secondCallMock.limit.mockResolvedValueOnce([]);

        const insertMock = createMockQueryBuilder();
        (mockDb.insert as any).mockReturnValueOnce(insertMock);
        insertMock.values.mockReturnValueOnce(insertMock);
        insertMock.returning.mockResolvedValueOnce([createMockRating({ rating: 5 })]);

        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockResolvedValueOnce([{ averageRating: '5', ratingCount: 1 }]);

        const res = await app.request('/api/resources/resource-1/rate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ rating: 5 }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.rating).toBe(5);
      });

      it('should update existing rating (upsert)', async () => {
        const firstCallMock = createMockQueryBuilder();
        const secondCallMock = createMockQueryBuilder();
        const thirdCallMock = createMockQueryBuilder();

        // Resource exists
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit.mockResolvedValueOnce([mockResources[0]]);

        // Existing rating found
        (mockDb.select as any).mockReturnValueOnce(secondCallMock);
        secondCallMock.from.mockReturnValueOnce(secondCallMock);
        secondCallMock.where.mockReturnValueOnce(secondCallMock);
        secondCallMock.limit.mockResolvedValueOnce([createMockRating({ rating: 3 })]);

        // Update rating
        const updateMock = createMockQueryBuilder();
        (mockDb.update as any).mockReturnValueOnce(updateMock);
        updateMock.set.mockReturnValueOnce(updateMock);
        updateMock.where.mockReturnValueOnce(updateMock);
        updateMock.returning.mockResolvedValueOnce([createMockRating({ rating: 5 })]);

        // Stats query
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockResolvedValueOnce([{ averageRating: '4.5', ratingCount: 3 }]);

        const res = await app.request('/api/resources/resource-1/rate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ rating: 5 }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.rating).toBe(5);
        expect(body.data.averageRating).toBe(4.5);
        expect(body.data.ratingCount).toBe(3);
      });
    });

    describe('response format', () => {
      it('should return ApiResponse format with rating and stats', async () => {
        const firstCallMock = createMockQueryBuilder();
        const secondCallMock = createMockQueryBuilder();
        const thirdCallMock = createMockQueryBuilder();

        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit.mockResolvedValueOnce([mockResources[0]]);

        (mockDb.select as any).mockReturnValueOnce(secondCallMock);
        secondCallMock.from.mockReturnValueOnce(secondCallMock);
        secondCallMock.where.mockReturnValueOnce(secondCallMock);
        secondCallMock.limit.mockResolvedValueOnce([]);

        const insertMock = createMockQueryBuilder();
        (mockDb.insert as any).mockReturnValueOnce(insertMock);
        insertMock.values.mockReturnValueOnce(insertMock);
        insertMock.returning.mockResolvedValueOnce([createMockRating({ rating: 4 })]);

        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockResolvedValueOnce([{ averageRating: '4.00', ratingCount: 1 }]);

        const res = await app.request('/api/resources/resource-1/rate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ rating: 4 }),
        });

        const body = await res.json();
        expect(body).toHaveProperty('success', true);
        expect(body.data).toHaveProperty('rating');
        expect(body.data).toHaveProperty('averageRating');
        expect(body.data).toHaveProperty('ratingCount');
        expect(typeof body.data.averageRating).toBe('number');
        expect(typeof body.data.ratingCount).toBe('number');
      });

      it('should return zero averageRating when no ratings exist', async () => {
        const firstCallMock = createMockQueryBuilder();
        const secondCallMock = createMockQueryBuilder();
        const thirdCallMock = createMockQueryBuilder();

        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit.mockResolvedValueOnce([mockResources[0]]);

        (mockDb.select as any).mockReturnValueOnce(secondCallMock);
        secondCallMock.from.mockReturnValueOnce(secondCallMock);
        secondCallMock.where.mockReturnValueOnce(secondCallMock);
        secondCallMock.limit.mockResolvedValueOnce([]);

        const insertMock = createMockQueryBuilder();
        (mockDb.insert as any).mockReturnValueOnce(insertMock);
        insertMock.values.mockReturnValueOnce(insertMock);
        insertMock.returning.mockResolvedValueOnce([createMockRating({ rating: 5 })]);

        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockResolvedValueOnce([{ averageRating: null, ratingCount: 0 }]);

        const res = await app.request('/api/resources/resource-1/rate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ rating: 5 }),
        });

        const body = await res.json();
        expect(body.data.averageRating).toBe(0);
        expect(body.data.ratingCount).toBe(0);
      });
    });
  });
});
