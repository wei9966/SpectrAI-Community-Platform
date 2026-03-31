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

// Mock modules - vi.mock is hoisted, so we cannot use external variables
vi.mock('../config/env.js', () => ({
  getEnv: () => mockEnv,
}));

vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

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
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([]),
        });

        const res = await app.request('/api/users/nonexistent');
        const body = await res.json();

        expect(res.status).toBe(404);
        expect(body.success).toBe(false);
        expect(body.error).toBe('User not found');
      });

      it('should return user profile with resource count', async () => {
        // User exists
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });
        // Resource count
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 5 }]),
        });

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
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([userWithoutAvatar]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 0 }]),
        });

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
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([]),
        });

        const res = await app.request('/api/users/nonexistent/resources');
        const body = await res.json();

        expect(res.status).toBe(404);
        expect(body.success).toBe(false);
        expect(body.error).toBe('User not found');
      });
    });

    describe('pagination', () => {
      it('should return paginated resources list', async () => {
        // User exists
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });
        // Resources
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
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve(mockResourcesList),
        });
        // Total count
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 2 }]),
        });

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
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 50 }]),
        });

        const res = await app.request('/api/users/testuser/resources?page=2&limit=25');
        const body = await res.json();

        expect(res.status).toBe(200);
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

        const res = await app.request('/api/users/testuser/resources?limit=500');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data.pagination.limit).toBe(100);
      });
    });

    describe('empty list', () => {
      it('should return empty resources list for user with no resources', async () => {
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 0 }]),
        });

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
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([]),
        });

        const res = await app.request('/api/users/non-existent/stats');
        const body = await res.json();

        expect(res.status).toBe(404);
        expect(body.success).toBe(false);
        expect(body.error).toBe('User not found');
      });
    });

    describe('stats calculation', () => {
      it('should return complete user stats', async () => {
        // User exists
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });
        // Resource stats (downloads & likes)
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ totalDownloads: '300', totalLikes: '130' }]),
        });
        // Rating stats
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ averageRating: '4.5' }]),
        });
        // Resource count
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ resourceCount: 2 }]),
        });

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
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ totalDownloads: null, totalLikes: null }]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ averageRating: null }]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ resourceCount: 0 }]),
        });

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
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([]),
        });

        const res = await app.request('/api/users/non-existent/activity');
        const body = await res.json();

        expect(res.status).toBe(404);
        expect(body.success).toBe(false);
        expect(body.error).toBe('User not found');
      });
    });

    describe('activity feed', () => {
      it('should return merged and sorted activities', async () => {
        // User exists
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });

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

        // Mock Promise.all results
        mockDb.select
          .mockReturnValueOnce({ where: () => Promise.resolve(recentResources) })
          .mockReturnValueOnce({ where: () => Promise.resolve(recentComments) })
          .mockReturnValueOnce({ where: () => Promise.resolve(recentLikes) })
          .mockReturnValueOnce({ where: () => Promise.resolve(recentFavorites) });

        const res = await app.request('/api/users/user-1/activity');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(4);
        // Should be sorted by createdAt descending
        expect(body.data[0].type).toBe('favorite');
        expect(body.data[1].type).toBe('like');
        expect(body.data[2].type).toBe('comment');
        expect(body.data[3].type).toBe('resource');
      });

      it('should include all activity types', async () => {
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });

        const recentResources = [
          { id: 'resource-1', title: 'Resource', createdAt: new Date('2026-01-01T00:00:00.000Z') },
        ];
        mockDb.select
          .mockReturnValueOnce({ where: () => Promise.resolve(recentResources) })
          .mockReturnValueOnce({ where: () => Promise.resolve([]) })
          .mockReturnValueOnce({ where: () => Promise.resolve([]) })
          .mockReturnValueOnce({ where: () => Promise.resolve([]) });

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
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });

        const manyActivities = Array(30).fill(null).map((_, i) => ({
          id: `resource-${i}`,
          title: `Resource ${i}`,
          createdAt: new Date(`2026-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`),
        }));

        mockDb.select
          .mockReturnValueOnce({ where: () => Promise.resolve(manyActivities) })
          .mockReturnValueOnce({ where: () => Promise.resolve([]) })
          .mockReturnValueOnce({ where: () => Promise.resolve([]) })
          .mockReturnValueOnce({ where: () => Promise.resolve([]) });

        const res = await app.request('/api/users/user-1/activity?limit=20');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data.length).toBeLessThanOrEqual(20);
      });

      it('should cap activity limit to maximum 50', async () => {
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });
        mockDb.select
          .mockReturnValueOnce({ where: () => Promise.resolve([]) })
          .mockReturnValueOnce({ where: () => Promise.resolve([]) })
          .mockReturnValueOnce({ where: () => Promise.resolve([]) })
          .mockReturnValueOnce({ where: () => Promise.resolve([]) });

        const res = await app.request('/api/users/user-1/activity?limit=100');
        await res.json();

        expect(res.status).toBe(200);
      });
    });
  });

  describe('GET /api/users/:id/likes', () => {
    describe('user existence', () => {
      it('should return 404 for non-existent user', async () => {
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([]),
        });

        const res = await app.request('/api/users/non-existent/likes');
        const body = await res.json();

        expect(res.status).toBe(404);
        expect(body.success).toBe(false);
        expect(body.error).toBe('User not found');
      });
    });

    describe('pagination', () => {
      it('should return paginated likes list', async () => {
        // User exists
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });
        // Likes with resource and author info
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
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve(mockLikesList),
        });
        // Total count
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 2 }]),
        });

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
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 50 }]),
        });

        const res = await app.request('/api/users/user-1/likes?page=2&limit=25');
        const body = await res.json();

        expect(res.status).toBe(200);
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

        const res = await app.request('/api/users/user-1/likes?limit=500');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data.pagination.limit).toBe(100);
      });
    });

    describe('empty list', () => {
      it('should return empty likes list for user with no likes', async () => {
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 0 }]),
        });

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
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });
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
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockLike]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 1 }]),
        });

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
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([]),
        });

        const res = await app.request('/api/users/non-existent/comments');
        const body = await res.json();

        expect(res.status).toBe(404);
        expect(body.success).toBe(false);
        expect(body.error).toBe('User not found');
      });
    });

    describe('pagination', () => {
      it('should return paginated comments list', async () => {
        // User exists
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });
        // Comments with resource info
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
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve(mockCommentsList),
        });
        // Total count
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 2 }]),
        });

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
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 50 }]),
        });

        const res = await app.request('/api/users/user-1/comments?page=2&limit=25');
        const body = await res.json();

        expect(res.status).toBe(200);
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

        const res = await app.request('/api/users/user-1/comments?limit=500');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data.pagination.limit).toBe(100);
      });
    });

    describe('empty list', () => {
      it('should return empty comments list for user with no comments', async () => {
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 0 }]),
        });

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
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockUsers[0]]),
        });
        const mockComment = {
          id: 'comment-1',
          content: 'Test comment',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          resource: { id: 'resource-1', name: 'Test Resource', type: 'workflow' as const },
        };
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockComment]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 1 }]),
        });

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
