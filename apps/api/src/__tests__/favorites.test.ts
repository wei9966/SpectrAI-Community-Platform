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
  mock.where = vi.fn(() => mock);
  mock.limit = vi.fn(() => mock);
  mock.offset = vi.fn(() => mock);
  mock.orderBy = vi.fn(() => mock);
  mock.innerJoin = vi.fn(() => mock);
  mock.leftJoin = vi.fn(() => mock);
  mock.returning = vi.fn(() => mock);
  mock.values = vi.fn(() => mock);
  mock.set = vi.fn(() => mock);
  mock.from = vi.fn(() => mock);
  mock.where.mockReturnThis();
  mock.limit.mockReturnThis();
  mock.offset.mockReturnThis();
  mock.orderBy.mockReturnThis();
  mock.innerJoin.mockReturnThis();
  mock.leftJoin.mockReturnThis();
  mock.values.mockReturnThis();
  mock.set.mockReturnThis();
  mock.from.mockReturnThis();
  mock.returning.mockReturnThis();
  // Make the mock object thenable so it can be awaited
  mock._resolveValue = [];
  mock.then = function(resolve: any) {
    resolve(this._resolveValue);
  };
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
  resources: {},
  resourceFavorites: {},
  users: {},
}));

// Import after mocking
import favoriteRoutes, { userFavoriteRoutes } from '../routes/favorites.js';
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
  {
    id: 'user-2',
    username: 'anotheruser',
    email: 'another@example.com',
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
  {
    id: 'resource-2',
    name: 'Another Resource',
    description: 'Another test resource',
    type: 'skill' as const,
    content: {},
    authorId: 'user-2',
    downloads: 200,
    likes: 80,
    tags: ['skill'],
    version: '1.0.0',
    isPublished: true,
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  },
];

const mockFavorites = [
  {
    id: 'favorite-1',
    resourceId: 'resource-1',
    userId: 'user-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  },
];

// Test factory functions
function createMockFavorite(overrides?: Partial<typeof mockFavorites[0]>) {
  return { ...mockFavorites[0], ...overrides };
}

function createMockResource(overrides?: Partial<typeof mockResources[0]>) {
  return { ...mockResources[0], ...overrides };
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

describe('favoriteRoutes', () => {
  let app: Hono;
  let validToken: string;

  beforeAll(async () => {
    const testUser = { ...mockUsers[0], passwordHash: await hash('Password123!', 12) };
    mockUsers[0] = testUser;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/api/resources', favoriteRoutes);
    validToken = generateTestToken('user-1');
  });

  describe('POST /api/resources/:id/favorite', () => {
    describe('authentication', () => {
      it('should reject favorite without authentication', async () => {
        const res = await app.request('/api/resources/resource-1/favorite', {
          method: 'POST',
        });

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.success).toBe(false);
      });

      it('should reject favorite with invalid token', async () => {
        const res = await app.request('/api/resources/resource-1/favorite', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer invalid-token',
          },
        });

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.success).toBe(false);
      });
    });

    describe('resource existence', () => {
      it('should reject favorite for non-existent resource', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit();
        firstCallMock._resolveValue = [];

        const res = await app.request('/api/resources/non-existent/favorite', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        });

        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.error).toBe('Resource not found');
      });
    });

    describe('toggle favorite', () => {
      it('should create favorite (not favorited before)', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit();
        firstCallMock._resolveValue = [mockResources[0]];

        const secondCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(secondCallMock);
        secondCallMock.from.mockReturnValueOnce(secondCallMock);
        secondCallMock.where.mockReturnValueOnce(secondCallMock);
        secondCallMock.limit();
        secondCallMock._resolveValue = [];

        const insertMock = createMockQueryBuilder();
        (mockDb.insert as any).mockReturnValueOnce(insertMock);
        insertMock.values.mockReturnValueOnce(insertMock);
        insertMock.returning();
        insertMock._resolveValue = [{}];

        const res = await app.request('/api/resources/resource-1/favorite', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.favorited).toBe(true);
      });

      it('should remove favorite (already favorited - toggle off)', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit();
        firstCallMock._resolveValue = [mockResources[0]];

        const secondCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(secondCallMock);
        secondCallMock.from.mockReturnValueOnce(secondCallMock);
        secondCallMock.where.mockReturnValueOnce(secondCallMock);
        secondCallMock.limit();
        secondCallMock._resolveValue = [createMockFavorite()];

        const deleteMock = createMockQueryBuilder();
        (mockDb.delete as any).mockReturnValueOnce(deleteMock);
        deleteMock.where.mockReturnValueOnce(deleteMock);
        deleteMock._resolveValue = {};

        const res = await app.request('/api/resources/resource-1/favorite', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.favorited).toBe(false);
      });

      it('should toggle favorite on then off', async () => {
        // First request - add favorite
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit();
        firstCallMock._resolveValue = [mockResources[0]];

        const secondCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(secondCallMock);
        secondCallMock.from.mockReturnValueOnce(secondCallMock);
        secondCallMock.where.mockReturnValueOnce(secondCallMock);
        secondCallMock.limit();
        secondCallMock._resolveValue = [];

        const insertMock = createMockQueryBuilder();
        (mockDb.insert as any).mockReturnValueOnce(insertMock);
        insertMock.values.mockReturnValueOnce(insertMock);
        insertMock.returning();
        insertMock._resolveValue = [{}];

        const res1 = await app.request('/api/resources/resource-1/favorite', {
          method: 'POST',
          headers: { Authorization: `Bearer ${validToken}` },
        });
        expect(res1.status).toBe(200);
        expect((await res1.json()).data.favorited).toBe(true);

        // Second request - remove favorite
        vi.clearAllMocks();

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        thirdCallMock._resolveValue = [mockResources[0]];

        const fourthCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(fourthCallMock);
        fourthCallMock.from.mockReturnValueOnce(fourthCallMock);
        fourthCallMock.where.mockReturnValueOnce(fourthCallMock);
        fourthCallMock.limit();
        fourthCallMock._resolveValue = [createMockFavorite()];

        const deleteMock = createMockQueryBuilder();
        (mockDb.delete as any).mockReturnValueOnce(deleteMock);
        deleteMock.where.mockReturnValueOnce(deleteMock);
        deleteMock._resolveValue = {};

        const res2 = await app.request('/api/resources/resource-1/favorite', {
          method: 'POST',
          headers: { Authorization: `Bearer ${validToken}` },
        });
        expect(res2.status).toBe(200);
        expect((await res2.json()).data.favorited).toBe(false);
      });
    });

    describe('response format', () => {
      it('should return ApiResponse format', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit();
        firstCallMock._resolveValue = [mockResources[0]];

        const secondCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(secondCallMock);
        secondCallMock.from.mockReturnValueOnce(secondCallMock);
        secondCallMock.where.mockReturnValueOnce(secondCallMock);
        secondCallMock.limit();
        secondCallMock._resolveValue = [];

        const insertMock = createMockQueryBuilder();
        (mockDb.insert as any).mockReturnValueOnce(insertMock);
        insertMock.values.mockReturnValueOnce(insertMock);
        insertMock.returning();
        insertMock._resolveValue = [{}];

        const res = await app.request('/api/resources/resource-1/favorite', {
          method: 'POST',
          headers: { Authorization: `Bearer ${validToken}` },
        });

        const body = await res.json();
        expect(body).toHaveProperty('success', true);
        expect(body.data).toHaveProperty('favorited');
        expect(typeof body.data.favorited).toBe('boolean');
      });
    });
  });
});

describe('userFavoriteRoutes', () => {
  let app: Hono;
  let validToken: string;

  beforeAll(async () => {
    const testUser = { ...mockUsers[0], passwordHash: await hash('Password123!', 12) };
    mockUsers[0] = testUser;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/api/users', userFavoriteRoutes);
    validToken = generateTestToken('user-1');
  });

  describe('GET /api/users/:id/favorites', () => {
    describe('user existence', () => {
      it('should reject for non-existent user', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit();
        firstCallMock._resolveValue = [];

        const res = await app.request('/api/users/non-existent/favorites');

        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.error).toBe('User not found');
      });

      it('should return empty favorites list for user with no favorites', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit();
        firstCallMock._resolveValue = [mockUsers[0]];

        const secondCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(secondCallMock);
        secondCallMock.from.mockReturnValueOnce(secondCallMock);
        secondCallMock.where.mockReturnValueOnce(secondCallMock);
        secondCallMock.limit();
        secondCallMock._resolveValue = [];

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        thirdCallMock._resolveValue = [{ total: 0 }];

        const res = await app.request('/api/users/user-1/favorites');

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.items).toEqual([]);
        expect(body.data.pagination).toHaveProperty('page', 1);
        expect(body.data.pagination).toHaveProperty('limit', 20);
        expect(body.data.pagination).toHaveProperty('total', 0);
      });
    });

    describe('pagination', () => {
      it('should return paginated favorites list', async () => {
        const mockFavoriteResources = [
          {
            id: 'resource-1',
            name: 'Resource 1',
            description: 'Desc 1',
            type: 'workflow' as const,
            tags: ['tag1'],
            downloads: 100,
            likes: 50,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            favoritedAt: new Date('2026-01-01T00:00:00.000Z'),
            author: { id: 'user-2', username: 'author1', avatarUrl: null },
          },
          {
            id: 'resource-2',
            name: 'Resource 2',
            description: 'Desc 2',
            type: 'skill' as const,
            tags: ['tag2'],
            downloads: 200,
            likes: 80,
            createdAt: new Date('2026-01-02T00:00:00.000Z'),
            favoritedAt: new Date('2026-01-02T00:00:00.000Z'),
            author: { id: 'user-3', username: 'author2', avatarUrl: null },
          },
        ];

        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit();
        firstCallMock._resolveValue = [mockUsers[0]];

        const secondCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(secondCallMock);
        secondCallMock.from.mockReturnValueOnce(secondCallMock);
        secondCallMock.where.mockReturnValueOnce(secondCallMock);
        secondCallMock.limit();
        secondCallMock._resolveValue = mockFavoriteResources;

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        thirdCallMock._resolveValue = [{ total: 2 }];

        const res = await app.request('/api/users/user-1/favorites?page=1&limit=10');

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.items).toHaveLength(2);
        expect(body.data.pagination).toEqual({
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        });
      });

      it('should accept custom page and limit parameters', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit();
        firstCallMock._resolveValue = [mockUsers[0]];

        const secondCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(secondCallMock);
        secondCallMock.from.mockReturnValueOnce(secondCallMock);
        secondCallMock.where.mockReturnValueOnce(secondCallMock);
        secondCallMock.limit();
        secondCallMock._resolveValue = [];

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        thirdCallMock._resolveValue = [{ total: 50 }];

        const res = await app.request('/api/users/user-1/favorites?page=2&limit=25');

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.pagination.page).toBe(2);
        expect(body.data.pagination.limit).toBe(25);
        expect(body.data.pagination.total).toBe(50);
        expect(body.data.pagination.totalPages).toBe(2);
      });

      it('should cap limit to maximum 100', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit();
        firstCallMock._resolveValue = [mockUsers[0]];

        const secondCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(secondCallMock);
        secondCallMock.from.mockReturnValueOnce(secondCallMock);
        secondCallMock.where.mockReturnValueOnce(secondCallMock);
        secondCallMock.limit();
        secondCallMock._resolveValue = [];

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        thirdCallMock._resolveValue = [{ total: 200 }];

        const res = await app.request('/api/users/user-1/favorites?limit=500');

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.pagination.limit).toBe(100);
      });
    });

    describe('response format', () => {
      it('should return ApiResponse format with items and pagination', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit();
        firstCallMock._resolveValue = [mockUsers[0]];

        const secondCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(secondCallMock);
        secondCallMock.from.mockReturnValueOnce(secondCallMock);
        secondCallMock.where.mockReturnValueOnce(secondCallMock);
        secondCallMock.limit();
        secondCallMock._resolveValue = [];

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        thirdCallMock._resolveValue = [{ total: 0 }];

        const res = await app.request('/api/users/user-1/favorites');

        const body = await res.json();
        expect(body).toHaveProperty('success', true);
        expect(body.data).toHaveProperty('items');
        expect(body.data).toHaveProperty('pagination');
        expect(Array.isArray(body.data.items)).toBe(true);
        expect(body.data.pagination).toHaveProperty('page');
        expect(body.data.pagination).toHaveProperty('limit');
        expect(body.data.pagination).toHaveProperty('total');
        expect(body.data.pagination).toHaveProperty('totalPages');
      });

      it('should include author info in favorite items', async () => {
        const mockResource = {
          id: 'resource-1',
          name: 'Test Resource',
          description: 'Description',
          type: 'workflow' as const,
          tags: [],
          downloads: 100,
          likes: 50,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          favoritedAt: new Date('2026-01-01T00:00:00.000Z'),
          author: { id: 'user-2', username: 'author', avatarUrl: null },
        };

        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit();
        firstCallMock._resolveValue = [mockUsers[0]];

        const secondCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(secondCallMock);
        secondCallMock.from.mockReturnValueOnce(secondCallMock);
        secondCallMock.where.mockReturnValueOnce(secondCallMock);
        secondCallMock.limit();
        secondCallMock._resolveValue = [mockResource];

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        thirdCallMock._resolveValue = [{ total: 1 }];

        const res = await app.request('/api/users/user-1/favorites');
        const body = await res.json();
        expect(body.data.items[0]).toHaveProperty('author');
        expect(body.data.items[0].author).toHaveProperty('id');
        expect(body.data.items[0].author).toHaveProperty('username');
      });
    });
  });
});
