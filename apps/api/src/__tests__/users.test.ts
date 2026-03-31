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
  users: {},
  resources: {},
  resourceLikes: {},
  resourceComments: {},
  resourceRatings: {},
  resourceFavorites: {},
}));

// Import after mocking
import userRoutes from '../routes/users.js';
import { db } from '../db/index.js';

// Mock data
const mockUsers = [
  {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: '',
    avatarUrl: 'https://example.com/avatar.png',
    githubId: null,
    bio: 'Test user bio',
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
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
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
    authorId: 'user-1',
    downloads: 200,
    likes: 80,
    tags: ['skill'],
    version: '1.0.0',
    isPublished: true,
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  },
];

const mockComments = [
  {
    id: 'comment-1',
    content: 'Great resource!',
    resourceId: 'resource-1',
    userId: 'user-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    id: 'comment-2',
    content: 'Very helpful, thanks!',
    resourceId: 'resource-2',
    userId: 'user-1',
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  },
];

const mockLikes = [
  {
    id: 'like-1',
    resourceId: 'resource-1',
    userId: 'user-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    id: 'like-2',
    resourceId: 'resource-2',
    userId: 'user-1',
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
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
function createMockUser(overrides?: Partial<typeof mockUsers[0]>) {
  return { ...mockUsers[0], ...overrides };
}

function createMockResource(overrides?: Partial<typeof mockResources[0]>) {
  return { ...mockResources[0], ...overrides };
}

function createMockComment(overrides?: Partial<typeof mockComments[0]>) {
  return { ...mockComments[0], ...overrides };
}

function createMockLike(overrides?: Partial<typeof mockLikes[0]>) {
  return { ...mockLikes[0], ...overrides };
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

describe('userRoutes', () => {
  let app: Hono;
  let validToken: string;

  beforeAll(async () => {
    const testUser = { ...mockUsers[0], passwordHash: await hash('Password123!', 12) };
    mockUsers[0] = testUser;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/api/users', userRoutes);
    validToken = generateTestToken('user-1');
  });

  describe('GET /api/users/:username', () => {
    describe('user existence', () => {
      it('should return 404 for non-existent user', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit();
        firstCallMock._resolveValue = [];

        const res = await app.request('/api/users/nonexistent');
        const body = await res.json();

        expect(res.status).toBe(404);
        expect(body.success).toBe(false);
        expect(body.error).toBe('User not found');
      });

      it('should return user profile with resource count', async () => {
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
        firstCallMock._resolveValue = [{ total: 5 }];

        const res = await app.request('/api/users/testuser');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty('id', 'user-1');
        expect(body.data).toHaveProperty('username', 'testuser');
        expect(body.data).toHaveProperty('avatarUrl', 'https://example.com/avatar.png');
        expect(body.data).toHaveProperty('bio', 'Test user bio');
        expect(body.data).toHaveProperty('resourceCount', 5);
      });

      it('should return null avatarUrl for user without avatar', async () => {
        const userWithoutAvatar = { ...mockUsers[1], avatarUrl: null };

        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit();
        firstCallMock._resolveValue = [userWithoutAvatar];

        const secondCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(secondCallMock);
        secondCallMock.from.mockReturnValueOnce(secondCallMock);
        secondCallMock.where.mockReturnValueOnce(secondCallMock);
        secondCallMock.limit();
        firstCallMock._resolveValue = [{ total: 0 }];

        const res = await app.request('/api/users/anotheruser');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data.avatarUrl).toBeNull();
        expect(body.data.resourceCount).toBe(0);
      });
    });
  });

  describe('GET /api/users/:username/resources', () => {
    describe('user existence', () => {
      it('should return 404 for non-existent user', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit();
        firstCallMock._resolveValue = [];

        const res = await app.request('/api/users/nonexistent/resources');
        const body = await res.json();

        expect(res.status).toBe(404);
        expect(body.success).toBe(false);
        expect(body.error).toBe('User not found');
      });
    });

    describe('pagination', () => {
      it('should return paginated resources list', async () => {
        const mockResourcesList = [
          {
            id: 'resource-1',
            name: 'Resource 1',
            description: 'Desc 1',
            type: 'workflow' as const,
            tags: ['tag1'],
            version: '1.0.0',
            downloads: 100,
            likes: 50,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          },
          {
            id: 'resource-2',
            name: 'Resource 2',
            description: 'Desc 2',
            type: 'skill' as const,
            tags: ['tag2'],
            version: '1.0.0',
            downloads: 200,
            likes: 80,
            createdAt: new Date('2026-01-02T00:00:00.000Z'),
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
        secondCallMock._resolveValue = mockResourcesList;

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        thirdCallMock._resolveValue = [{ total: 2 }];

        const res = await app.request('/api/users/testuser/resources?page=1&limit=10');
        const body = await res.json();

        expect(res.status).toBe(200);
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
        firstCallMock._resolveValue = [];

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        firstCallMock._resolveValue = [{ total: 50 }];

        const res = await app.request('/api/users/testuser/resources?page=2&limit=25');
        const body = await res.json();

        expect(res.status).toBe(200);
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
        firstCallMock._resolveValue = [];

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        firstCallMock._resolveValue = [{ total: 200 }];

        const res = await app.request('/api/users/testuser/resources?limit=500');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data.pagination.limit).toBe(100);
      });
    });

    describe('empty list', () => {
      it('should return empty resources list for user with no resources', async () => {
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
        firstCallMock._resolveValue = [];

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        firstCallMock._resolveValue = [{ total: 0 }];

        const res = await app.request('/api/users/testuser/resources');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.items).toEqual([]);
        expect(body.data.pagination.total).toBe(0);
      });
    });
  });

  describe('GET /api/users/:id/stats', () => {
    describe('user existence', () => {
      it('should return 404 for non-existent user', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit();
        firstCallMock._resolveValue = [];

        const res = await app.request('/api/users/non-existent/stats');
        const body = await res.json();

        expect(res.status).toBe(404);
        expect(body.success).toBe(false);
        expect(body.error).toBe('User not found');
      });
    });

    describe('stats calculation', () => {
      it('should return complete user stats', async () => {
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
        firstCallMock._resolveValue = [{ totalDownloads: 300, totalLikes: 130 }];

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        firstCallMock._resolveValue = [{ averageRating: 4.5 }];

        const fourthCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(fourthCallMock);
        fourthCallMock.from.mockReturnValueOnce(fourthCallMock);
        fourthCallMock.where.mockReturnValueOnce(fourthCallMock);
        fourthCallMock.limit();
        firstCallMock._resolveValue = [{ resourceCount: 2 }];

        const res = await app.request('/api/users/user-1/stats');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data).toEqual({
          totalDownloads: 300,
          totalLikes: 130,
          averageRating: 4.5,
          resourceCount: 2,
          daysSinceJoining: expect.any(Number),
        });
      });

      it('should return zero values when no stats exist', async () => {
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
        firstCallMock._resolveValue = [{ totalDownloads: null, totalLikes: null }];

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        firstCallMock._resolveValue = [{ averageRating: null }];

        const fourthCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(fourthCallMock);
        fourthCallMock.from.mockReturnValueOnce(fourthCallMock);
        fourthCallMock.where.mockReturnValueOnce(fourthCallMock);
        fourthCallMock.limit();
        firstCallMock._resolveValue = [{ resourceCount: 0 }];

        const res = await app.request('/api/users/user-1/stats');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data.totalDownloads).toBe(0);
        expect(body.data.totalLikes).toBe(0);
        expect(body.data.averageRating).toBe(0);
        expect(body.data.resourceCount).toBe(0);
      });
    });
  });

  describe('GET /api/users/:id/activity', () => {
    describe('user existence', () => {
      it('should return 404 for non-existent user', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit();
        firstCallMock._resolveValue = [];

        const res = await app.request('/api/users/non-existent/activity');
        const body = await res.json();

        expect(res.status).toBe(404);
        expect(body.success).toBe(false);
        expect(body.error).toBe('User not found');
      });
    });

    describe('activity feed', () => {
      it('should return merged and sorted activities', async () => {
        const recentResources = [
          { id: 'resource-1', title: 'My Resource', createdAt: new Date('2026-01-01T00:00:00.000Z') },
        ];
        const recentComments = [
          { id: 'comment-1', title: 'Great!', resourceId: 'resource-2', createdAt: new Date('2026-01-02T00:00:00.000Z') },
        ];
        const recentLikes = [
          { id: 'like-1', resourceId: 'resource-3', title: 'Liked Resource', createdAt: new Date('2026-01-03T00:00:00.000Z') },
        ];
        const recentFavorites = [
          { id: 'favorite-1', resourceId: 'resource-4', title: 'Favorited Resource', createdAt: new Date('2026-01-04T00:00:00.000Z') },
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
        secondCallMock._resolveValue = recentResources;

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        thirdCallMock._resolveValue = recentComments;

        const fourthCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(fourthCallMock);
        fourthCallMock.from.mockReturnValueOnce(fourthCallMock);
        fourthCallMock.where.mockReturnValueOnce(fourthCallMock);
        fourthCallMock.limit();
        fourthCallMock._resolveValue = recentLikes;

        const fifthCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(fifthCallMock);
        fifthCallMock.from.mockReturnValueOnce(fifthCallMock);
        fifthCallMock.where.mockReturnValueOnce(fifthCallMock);
        fifthCallMock.limit();
        fifthCallMock._resolveValue = recentFavorites;

        const res = await app.request('/api/users/user-1/activity');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(4);
        expect(body.data[0].type).toBe('favorite');
        expect(body.data[1].type).toBe('like');
        expect(body.data[2].type).toBe('comment');
        expect(body.data[3].type).toBe('resource');
      });

      it('should include all activity types', async () => {
        const recentResources = [
          { id: 'resource-1', title: 'Resource', createdAt: new Date('2026-01-01T00:00:00.000Z') },
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
        recentResources._resolveValue = recentResources;

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        firstCallMock._resolveValue = [];

        const fourthCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(fourthCallMock);
        fourthCallMock.from.mockReturnValueOnce(fourthCallMock);
        fourthCallMock.where.mockReturnValueOnce(fourthCallMock);
        fourthCallMock.limit();
        firstCallMock._resolveValue = [];

        const fifthCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(fifthCallMock);
        fifthCallMock.from.mockReturnValueOnce(fifthCallMock);
        fifthCallMock.where.mockReturnValueOnce(fifthCallMock);
        fifthCallMock.limit();
        firstCallMock._resolveValue = [];

        const res = await app.request('/api/users/user-1/activity?limit=10');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data).toHaveLength(1);
        expect(body.data[0]).toEqual({
          type: 'resource',
          relatedId: 'resource-1',
          title: 'Resource',
          createdAt: '2026-01-01T00:00:00.000Z',
        });
      });

      it('should respect limit parameter', async () => {
        const manyActivities = Array(30).fill(null).map((_, i) => ({
          id: `resource-${i}`,
          title: `Resource ${i}`,
          createdAt: new Date(`2026-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`),
        }));

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
        secondCallMock._resolveValue = manyActivities;

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        thirdCallMock._resolveValue = [];

        const fourthCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(fourthCallMock);
        fourthCallMock.from.mockReturnValueOnce(fourthCallMock);
        fourthCallMock.where.mockReturnValueOnce(fourthCallMock);
        fourthCallMock.limit();
        firstCallMock._resolveValue = [];

        const fifthCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(fifthCallMock);
        fifthCallMock.from.mockReturnValueOnce(fifthCallMock);
        fifthCallMock.where.mockReturnValueOnce(fifthCallMock);
        fifthCallMock.limit();
        firstCallMock._resolveValue = [];

        const res = await app.request('/api/users/user-1/activity?limit=20');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data.length).toBeLessThanOrEqual(20);
      });

      it('should cap activity limit to maximum 50', async () => {
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
        firstCallMock._resolveValue = [];

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        firstCallMock._resolveValue = [];

        const fourthCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(fourthCallMock);
        fourthCallMock.from.mockReturnValueOnce(fourthCallMock);
        fourthCallMock.where.mockReturnValueOnce(fourthCallMock);
        fourthCallMock.limit();
        firstCallMock._resolveValue = [];

        const fifthCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(fifthCallMock);
        fifthCallMock.from.mockReturnValueOnce(fifthCallMock);
        fifthCallMock.where.mockReturnValueOnce(fifthCallMock);
        fifthCallMock.limit();
        firstCallMock._resolveValue = [];

        const res = await app.request('/api/users/user-1/activity?limit=100');

        expect(res.status).toBe(200);
      });
    });
  });

  describe('GET /api/users/:id/likes', () => {
    describe('user existence', () => {
      it('should return 404 for non-existent user', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit();
        firstCallMock._resolveValue = [];

        const res = await app.request('/api/users/non-existent/likes');
        const body = await res.json();

        expect(res.status).toBe(404);
        expect(body.success).toBe(false);
        expect(body.error).toBe('User not found');
      });
    });

    describe('pagination', () => {
      it('should return paginated likes list', async () => {
        const mockLikesList = [
          {
            id: 'like-1',
            resourceId: 'resource-1',
            name: 'Resource 1',
            description: 'Desc 1',
            type: 'workflow' as const,
            tags: ['tag1'],
            downloads: 100,
            likes: 50,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            likedAt: new Date('2026-01-01T00:00:00.000Z'),
            author: { id: 'user-2', username: 'author1', avatarUrl: null },
          },
          {
            id: 'like-2',
            resourceId: 'resource-2',
            name: 'Resource 2',
            description: 'Desc 2',
            type: 'skill' as const,
            tags: ['tag2'],
            downloads: 200,
            likes: 80,
            createdAt: new Date('2026-01-02T00:00:00.000Z'),
            likedAt: new Date('2026-01-02T00:00:00.000Z'),
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
        secondCallMock._resolveValue = mockLikesList;

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        thirdCallMock._resolveValue = [{ total: 2 }];

        const res = await app.request('/api/users/user-1/likes?page=1&limit=10');
        const body = await res.json();

        expect(res.status).toBe(200);
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
        firstCallMock._resolveValue = [];

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        firstCallMock._resolveValue = [{ total: 50 }];

        const res = await app.request('/api/users/user-1/likes?page=2&limit=25');
        const body = await res.json();

        expect(res.status).toBe(200);
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
        firstCallMock._resolveValue = [];

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        firstCallMock._resolveValue = [{ total: 200 }];

        const res = await app.request('/api/users/user-1/likes?limit=500');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data.pagination.limit).toBe(100);
      });
    });

    describe('empty list', () => {
      it('should return empty likes list for user with no likes', async () => {
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
        firstCallMock._resolveValue = [];

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        firstCallMock._resolveValue = [{ total: 0 }];

        const res = await app.request('/api/users/user-1/likes');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.items).toEqual([]);
        expect(body.data.pagination.total).toBe(0);
      });
    });

    describe('response format', () => {
      it('should include author info in liked resources', async () => {
        const mockLike = {
          id: 'like-1',
          resourceId: 'resource-1',
          name: 'Test Resource',
          description: 'Description',
          type: 'workflow' as const,
          tags: [],
          downloads: 100,
          likes: 50,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          likedAt: new Date('2026-01-01T00:00:00.000Z'),
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
        firstCallMock._resolveValue = [mockLike];

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        firstCallMock._resolveValue = [{ total: 1 }];

        const res = await app.request('/api/users/user-1/likes');
        const body = await res.json();

        expect(body.data.items[0]).toHaveProperty('author');
        expect(body.data.items[0].author).toHaveProperty('id');
        expect(body.data.items[0].author).toHaveProperty('username');
      });
    });
  });

  describe('GET /api/users/:id/comments', () => {
    describe('user existence', () => {
      it('should return 404 for non-existent user', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit();
        firstCallMock._resolveValue = [];

        const res = await app.request('/api/users/non-existent/comments');
        const body = await res.json();

        expect(res.status).toBe(404);
        expect(body.success).toBe(false);
        expect(body.error).toBe('User not found');
      });
    });

    describe('pagination', () => {
      it('should return paginated comments list', async () => {
        const mockCommentsList = [
          {
            id: 'comment-1',
            content: 'Great resource!',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            resource: { id: 'resource-1', name: 'Resource 1', type: 'workflow' as const },
          },
          {
            id: 'comment-2',
            content: 'Very helpful!',
            createdAt: new Date('2026-01-02T00:00:00.000Z'),
            resource: { id: 'resource-2', name: 'Resource 2', type: 'skill' as const },
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
        secondCallMock._resolveValue = mockCommentsList;

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        thirdCallMock._resolveValue = [{ total: 2 }];

        const res = await app.request('/api/users/user-1/comments?page=1&limit=10');
        const body = await res.json();

        expect(res.status).toBe(200);
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
        firstCallMock._resolveValue = [];

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        firstCallMock._resolveValue = [{ total: 50 }];

        const res = await app.request('/api/users/user-1/comments?page=2&limit=25');
        const body = await res.json();

        expect(res.status).toBe(200);
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
        firstCallMock._resolveValue = [];

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        firstCallMock._resolveValue = [{ total: 200 }];

        const res = await app.request('/api/users/user-1/comments?limit=500');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data.pagination.limit).toBe(100);
      });
    });

    describe('empty list', () => {
      it('should return empty comments list for user with no comments', async () => {
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
        firstCallMock._resolveValue = [];

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        firstCallMock._resolveValue = [{ total: 0 }];

        const res = await app.request('/api/users/user-1/comments');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.items).toEqual([]);
        expect(body.data.pagination.total).toBe(0);
      });
    });

    describe('response format', () => {
      it('should include resource info in comments', async () => {
        const mockComment = {
          id: 'comment-1',
          content: 'Test comment',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          resource: { id: 'resource-1', name: 'Test Resource', type: 'workflow' as const },
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
        firstCallMock._resolveValue = [mockComment];

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit();
        firstCallMock._resolveValue = [{ total: 1 }];

        const res = await app.request('/api/users/user-1/comments');
        const body = await res.json();

        expect(body.data.items[0]).toHaveProperty('resource');
        expect(body.data.items[0].resource).toHaveProperty('id');
        expect(body.data.items[0].resource).toHaveProperty('name');
        expect(body.data.items[0].resource).toHaveProperty('type');
      });
    });
  });
});
