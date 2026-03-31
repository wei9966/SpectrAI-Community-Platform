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

// Mock modules - vi.mock is hoisted
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

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: (c: any, next: any) => next(),
  optionalAuthMiddleware: (c: any, next: any) => next(),
}));

// Import after mocking
import resourceRoutes from '../routes/resources.js';
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
  {
    id: 'resource-3',
    name: 'High Rated Resource',
    description: 'Highly rated test resource',
    type: 'workflow' as const,
    content: {},
    authorId: 'user-1',
    downloads: 300,
    likes: 150,
    tags: ['premium'],
    version: '2.0.0',
    isPublished: true,
    createdAt: new Date('2026-01-03T00:00:00.000Z'),
    updatedAt: new Date('2026-01-03T00:00:00.000Z'),
  },
];

// Test factory functions
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

describe('resourceRoutes - rating features', () => {
  let app: Hono;
  let validToken: string;

  beforeAll(async () => {
    const testUser = { ...mockUsers[0], passwordHash: await hash('Password123!', 12) };
    mockUsers[0] = testUser;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/api/resources', resourceRoutes);
    validToken = generateTestToken('user-1');
  });

  describe('GET /api/resources - sort by rating', () => {
    describe('sort=rating parameter', () => {
      it('should sort resources by average rating descending', async () => {
        const mockResourcesList = [
          {
            id: 'resource-3',
            name: 'High Rated Resource',
            description: 'Highly rated',
            type: 'workflow' as const,
            tags: ['premium'],
            version: '2.0.0',
            downloads: 300,
            likes: 150,
            isPublished: true,
            createdAt: new Date('2026-01-03T00:00:00.000Z'),
            author: { id: 'user-1', username: 'testuser', avatarUrl: 'https://example.com/avatar.png' },
            averageRating: 4.8,
            ratingCount: 25,
            isFavorited: false,
          },
          {
            id: 'resource-1',
            name: 'Test Resource',
            description: 'A test resource',
            type: 'workflow' as const,
            tags: ['test'],
            version: '1.0.0',
            downloads: 100,
            likes: 50,
            isPublished: true,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            author: { id: 'user-1', username: 'testuser', avatarUrl: 'https://example.com/avatar.png' },
            averageRating: 4.0,
            ratingCount: 10,
            isFavorited: false,
          },
          {
            id: 'resource-2',
            name: 'Another Resource',
            description: 'Another test resource',
            type: 'skill' as const,
            tags: ['skill'],
            version: '1.0.0',
            downloads: 200,
            likes: 80,
            isPublished: true,
            createdAt: new Date('2026-01-02T00:00:00.000Z'),
            author: { id: 'user-1', username: 'testuser', avatarUrl: 'https://example.com/avatar.png' },
            averageRating: 3.5,
            ratingCount: 8,
            isFavorited: false,
          },
        ];

        // Mock resources list query
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve(mockResourcesList),
        });
        // Mock total count query
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 3 }]),
        });

        const res = await app.request('/api/resources?sort=rating');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.items).toHaveLength(3);
        // Verify sorted by rating descending
        expect(body.data.items[0].averageRating).toBe(4.8);
        expect(body.data.items[1].averageRating).toBe(4.0);
        expect(body.data.items[2].averageRating).toBe(3.5);
      });

      it('should include ratingCount field for each resource', async () => {
        const mockResourceWithRatings = {
          id: 'resource-1',
          name: 'Test Resource',
          description: 'A test resource',
          type: 'workflow' as const,
          tags: ['test'],
          version: '1.0.0',
          downloads: 100,
          likes: 50,
          isPublished: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          author: { id: 'user-1', username: 'testuser', avatarUrl: 'https://example.com/avatar.png' },
          averageRating: 4.25,
          ratingCount: 12,
          isFavorited: false,
        };

        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockResourceWithRatings]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 1 }]),
        });

        const res = await app.request('/api/resources?sort=rating');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data.items[0]).toHaveProperty('ratingCount');
        expect(body.data.items[0].ratingCount).toBe(12);
      });

      it('should include averageRating field for each resource', async () => {
        const mockResourceWithRatings = {
          id: 'resource-1',
          name: 'Test Resource',
          description: 'A test resource',
          type: 'workflow' as const,
          tags: ['test'],
          version: '1.0.0',
          downloads: 100,
          likes: 50,
          isPublished: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          author: { id: 'user-1', username: 'testuser', avatarUrl: 'https://example.com/avatar.png' },
          averageRating: 4.50,
          ratingCount: 20,
          isFavorited: false,
        };

        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockResourceWithRatings]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 1 }]),
        });

        const res = await app.request('/api/resources');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data.items[0]).toHaveProperty('averageRating');
        expect(body.data.items[0].averageRating).toBe(4.5);
      });

      it('should return zero averageRating when no ratings exist', async () => {
        const mockResourceNoRatings = {
          id: 'resource-1',
          name: 'New Resource',
          description: 'No ratings yet',
          type: 'workflow' as const,
          tags: ['new'],
          version: '1.0.0',
          downloads: 0,
          likes: 0,
          isPublished: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          author: { id: 'user-1', username: 'testuser', avatarUrl: 'https://example.com/avatar.png' },
          averageRating: 0,
          ratingCount: 0,
          isFavorited: false,
        };

        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockResourceNoRatings]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 1 }]),
        });

        const res = await app.request('/api/resources');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data.items[0].averageRating).toBe(0);
        expect(body.data.items[0].ratingCount).toBe(0);
      });
    });

    describe('isFavorited field', () => {
      it('should include isFavorited field in response', async () => {
        const mockResource = {
          id: 'resource-1',
          name: 'Test Resource',
          description: 'A test resource',
          type: 'workflow' as const,
          tags: ['test'],
          version: '1.0.0',
          downloads: 100,
          likes: 50,
          isPublished: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          author: { id: 'user-1', username: 'testuser', avatarUrl: 'https://example.com/avatar.png' },
          averageRating: 4.0,
          ratingCount: 10,
          isFavorited: true,
        };

        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockResource]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 1 }]),
        });

        const res = await app.request('/api/resources');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data.items[0]).toHaveProperty('isFavorited');
        expect(typeof body.data.items[0].isFavorited).toBe('boolean');
      });

      it('should set isFavorited to false for unauthenticated users', async () => {
        const mockResource = {
          id: 'resource-1',
          name: 'Test Resource',
          description: 'A test resource',
          type: 'workflow' as const,
          tags: ['test'],
          version: '1.0.0',
          downloads: 100,
          likes: 50,
          isPublished: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          author: { id: 'user-1', username: 'testuser', avatarUrl: 'https://example.com/avatar.png' },
          averageRating: 4.0,
          ratingCount: 10,
          isFavorited: false,
        };

        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockResource]),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 1 }]),
        });

        const res = await app.request('/api/resources');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data.items[0].isFavorited).toBe(false);
      });
    });

    describe('pagination with rating sort', () => {
      it('should return correct pagination with sort=rating', async () => {
        const mockResourcesList = Array(25).fill(null).map((_, i) => ({
          id: `resource-${i}`,
          name: `Resource ${i}`,
          description: `Description ${i}`,
          type: 'workflow' as const,
          tags: ['test'],
          version: '1.0.0',
          downloads: 100 + i,
          likes: 50 + i,
          isPublished: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          author: { id: 'user-1', username: 'testuser', avatarUrl: 'https://example.com/avatar.png' },
          averageRating: 5 - (i * 0.1),
          ratingCount: 10 + i,
          isFavorited: false,
        }));

        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve(mockResourcesList.slice(0, 20)),
        });
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([{ total: 25 }]),
        });

        const res = await app.request('/api/resources?sort=rating&page=1&limit=20');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data.pagination).toEqual({
          page: 1,
          limit: 20,
          total: 25,
          totalPages: 2,
        });
      });
    });
  });

  describe('GET /api/resources/:id - rating fields in detail', () => {
    describe('averageRating field', () => {
      it('should include averageRating in resource detail response', async () => {
        const mockResourceDetail = {
          id: 'resource-1',
          name: 'Test Resource',
          description: 'A test resource',
          type: 'workflow' as const,
          content: { data: 'test' },
          tags: ['test'],
          version: '1.0.0',
          downloads: 100,
          likes: 50,
          isPublished: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          author: { id: 'user-1', username: 'testuser', avatarUrl: 'https://example.com/avatar.png', bio: 'Test bio' },
          averageRating: 4.25,
          ratingCount: 16,
          isFavorited: false,
          userRating: null,
        };

        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockResourceDetail]),
        });

        const res = await app.request('/api/resources/resource-1');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty('averageRating');
        expect(body.data.averageRating).toBe(4.25);
      });

      it('should return zero averageRating when no ratings', async () => {
        const mockResourceNoRatings = {
          id: 'resource-1',
          name: 'New Resource',
          description: 'No ratings yet',
          type: 'workflow' as const,
          content: {},
          tags: [],
          version: '1.0.0',
          downloads: 0,
          likes: 0,
          isPublished: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          author: { id: 'user-1', username: 'testuser', avatarUrl: null, bio: null },
          averageRating: 0,
          ratingCount: 0,
          isFavorited: false,
          userRating: null,
        };

        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockResourceNoRatings]),
        });

        const res = await app.request('/api/resources/resource-1');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data.averageRating).toBe(0);
        expect(body.data.ratingCount).toBe(0);
      });
    });

    describe('ratingCount field', () => {
      it('should include ratingCount in resource detail response', async () => {
        const mockResourceDetail = {
          id: 'resource-1',
          name: 'Popular Resource',
          description: 'Many ratings',
          type: 'workflow' as const,
          content: {},
          tags: ['popular'],
          version: '1.0.0',
          downloads: 500,
          likes: 200,
          isPublished: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          author: { id: 'user-1', username: 'testuser', avatarUrl: 'https://example.com/avatar.png', bio: 'Test bio' },
          averageRating: 4.5,
          ratingCount: 100,
          isFavorited: false,
          userRating: null,
        };

        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockResourceDetail]),
        });

        const res = await app.request('/api/resources/resource-1');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data).toHaveProperty('ratingCount');
        expect(body.data.ratingCount).toBe(100);
      });
    });

    describe('userRating field', () => {
      it('should include userRating when user is authenticated', async () => {
        const mockResourceWithUserRating = {
          id: 'resource-1',
          name: 'Test Resource',
          description: 'A test resource',
          type: 'workflow' as const,
          content: {},
          tags: ['test'],
          version: '1.0.0',
          downloads: 100,
          likes: 50,
          isPublished: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          author: { id: 'user-1', username: 'testuser', avatarUrl: 'https://example.com/avatar.png', bio: 'Test bio' },
          averageRating: 4.0,
          ratingCount: 10,
          isFavorited: false,
          userRating: 5,
        };

        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockResourceWithUserRating]),
        });

        const res = await app.request('/api/resources/resource-1');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data).toHaveProperty('userRating');
        expect(body.data.userRating).toBe(5);
      });

      it('should return null userRating when user has not rated', async () => {
        const mockResourceNoUserRating = {
          id: 'resource-1',
          name: 'Test Resource',
          description: 'A test resource',
          type: 'workflow' as const,
          content: {},
          tags: ['test'],
          version: '1.0.0',
          downloads: 100,
          likes: 50,
          isPublished: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          author: { id: 'user-1', username: 'testuser', avatarUrl: 'https://example.com/avatar.png', bio: 'Test bio' },
          averageRating: 4.0,
          ratingCount: 10,
          isFavorited: false,
          userRating: null,
        };

        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockResourceNoUserRating]),
        });

        const res = await app.request('/api/resources/resource-1');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data.userRating).toBe(null);
      });
    });

    describe('isFavorited field in detail', () => {
      it('should include isFavorited in resource detail response', async () => {
        const mockResourceDetail = {
          id: 'resource-1',
          name: 'Test Resource',
          description: 'A test resource',
          type: 'workflow' as const,
          content: {},
          tags: ['test'],
          version: '1.0.0',
          downloads: 100,
          likes: 50,
          isPublished: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          author: { id: 'user-1', username: 'testuser', avatarUrl: 'https://example.com/avatar.png', bio: 'Test bio' },
          averageRating: 4.0,
          ratingCount: 10,
          isFavorited: true,
          userRating: null,
        };

        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([mockResourceDetail]),
        });

        const res = await app.request('/api/resources/resource-1');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data).toHaveProperty('isFavorited');
        expect(body.data.isFavorited).toBe(true);
      });
    });

    describe('resource not found', () => {
      it('should return 404 for non-existent resource', async () => {
        mockDb.select.mockReturnValueOnce({
          where: () => Promise.resolve([]),
        });

        const res = await app.request('/api/resources/non-existent');
        const body = await res.json();

        expect(res.status).toBe(404);
        expect(body.success).toBe(false);
        expect(body.error).toBe('Resource not found');
      });
    });
  });

  describe('ApiResponse format with rating fields', () => {
    it('should return proper ApiResponse format for list endpoint', async () => {
      const mockResource = {
        id: 'resource-1',
        name: 'Test Resource',
        description: 'A test resource',
        type: 'workflow' as const,
        tags: ['test'],
        version: '1.0.0',
        downloads: 100,
        likes: 50,
        isPublished: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        author: { id: 'user-1', username: 'testuser', avatarUrl: 'https://example.com/avatar.png' },
        averageRating: 4.0,
        ratingCount: 10,
        isFavorited: false,
      };

      mockDb.select.mockReturnValueOnce({
        where: () => Promise.resolve([mockResource]),
      });
      mockDb.select.mockReturnValueOnce({
        where: () => Promise.resolve([{ total: 1 }]),
      });

      const res = await app.request('/api/resources?sort=rating');
      const body = await res.json();

      expect(body).toHaveProperty('success', true);
      expect(body.data).toHaveProperty('items');
      expect(body.data).toHaveProperty('pagination');
      expect(Array.isArray(body.data.items)).toBe(true);
      expect(body.data.items[0]).toHaveProperty('averageRating');
      expect(body.data.items[0]).toHaveProperty('ratingCount');
    });

    it('should return proper ApiResponse format for detail endpoint', async () => {
      const mockResourceDetail = {
        id: 'resource-1',
        name: 'Test Resource',
        description: 'A test resource',
        type: 'workflow' as const,
        content: {},
        tags: ['test'],
        version: '1.0.0',
        downloads: 100,
        likes: 50,
        isPublished: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        author: { id: 'user-1', username: 'testuser', avatarUrl: 'https://example.com/avatar.png', bio: 'Test bio' },
        averageRating: 4.25,
        ratingCount: 16,
        isFavorited: false,
        userRating: 4,
      };

      mockDb.select.mockReturnValueOnce({
        where: () => Promise.resolve([mockResourceDetail]),
      });

      const res = await app.request('/api/resources/resource-1');
      const body = await res.json();

      expect(body).toHaveProperty('success', true);
      expect(body.data).toHaveProperty('averageRating');
      expect(body.data).toHaveProperty('ratingCount');
      expect(body.data).toHaveProperty('isFavorited');
      expect(body.data).toHaveProperty('userRating');
      expect(typeof body.data.averageRating).toBe('number');
      expect(typeof body.data.ratingCount).toBe('number');
    });
  });
});
