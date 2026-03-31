import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { Hono } from 'hono';
import { sign } from 'jsonwebtoken';
import { hash } from 'bcryptjs';

// Mock db methods
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

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

// Mock env
const mockEnv = {
  PORT: 3000,
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://test:test@localhost:5432/test',
  JWT_SECRET: 'test-jwt-secret-key-for-testing',
  GITHUB_CLIENT_ID: 'test-github-client-id',
  GITHUB_CLIENT_SECRET: 'test-github-client-secret',
};

// Mock modules
vi.mock('../config/env.js', () => ({
  getEnv: () => mockEnv,
}));

vi.mock('../db/index.js', () => ({
  db: mockDb,
}));

vi.mock('../db/schema.js', () => ({
  resources: {},
  resourceFavorites: {},
  users: {},
}));

// Import after mocking
import favoriteRoutes, { userFavoriteRoutes } from '../routes/favorites.js';

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
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([]),
        });

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
        // Resource exists
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockResources[0]]),
        });
        // No existing favorite
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([]),
        });
        // Insert
        mockDb.insert.mockReturnValue({
          values: () => Promise.resolve({}),
        });

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
        // Resource exists
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockResources[0]]),
        });
        // Existing favorite found
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([createMockFavorite()]),
        });
        // Delete
        mockDb.delete.mockReturnValue({
          where: () => Promise.resolve({}),
        });

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
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockResources[0]]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([]),
        });
        mockDb.insert.mockReturnValue({ values: () => Promise.resolve({}) });

        const res1 = await app.request('/api/resources/resource-1/favorite', {
          method: 'POST',
          headers: { Authorization: `Bearer ${validToken}` },
        });
        expect(res1.status).toBe(200);
        expect((await res1.json()).data.favorited).toBe(true);

        // Second request - remove favorite
        vi.clearAllMocks();
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockResources[0]]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([createMockFavorite()]),
        });
        mockDb.delete.mockReturnValue({ where: () => Promise.resolve({}) });

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
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockResources[0]]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([]),
        });
        mockDb.insert.mockReturnValue({ values: () => Promise.resolve({}) });

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
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([]),
        });

        const res = await app.request('/api/users/non-existent/favorites');

        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.error).toBe('User not found');
      });

      it('should return empty favorites list for user with no favorites', async () => {
        // User exists
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });
        // No favorites
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 0 }]),
        });

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

        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve(mockFavoriteResources),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 2 }]),
        });

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
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 50 }]),
        });

        const res = await app.request('/api/users/user-1/favorites?page=2&limit=25');

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.pagination.page).toBe(2);
        expect(body.data.pagination.limit).toBe(25);
        expect(body.data.pagination.total).toBe(50);
        expect(body.data.pagination.totalPages).toBe(2);
      });

      it('should cap limit to maximum 100', async () => {
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 200 }]),
        });

        const res = await app.request('/api/users/user-1/favorites?limit=500');

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.pagination.limit).toBe(100);
      });
    });

    describe('response format', () => {
      it('should return ApiResponse format with items and pagination', async () => {
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 0 }]),
        });

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

        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockResource]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 1 }]),
        });

        const res = await app.request('/api/users/user-1/favorites');
        const body = await res.json();
        expect(body.data.items[0]).toHaveProperty('author');
        expect(body.data.items[0].author).toHaveProperty('id');
        expect(body.data.items[0].author).toHaveProperty('username');
      });
    });
  });
});
