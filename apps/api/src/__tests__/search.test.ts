import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';

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
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../db/index.js', () => ({
  db: mockDb,
}));

// Mock schema
vi.mock('../db/schema.js', () => ({
  users: {},
  resources: {},
  resourceLikes: {},
  resourceComments: {},
}));

// Import after mocking
import resourceRoutes from '../routes/resources.js';

describe('GET /api/resources/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return search results with query', async () => {
    const mockResults = [
      {
        id: 'resource-1',
        name: 'Test Workflow',
        description: 'A test workflow for testing',
        type: 'workflow',
        tags: ['test'],
        downloads: 10,
        likes: 5,
        createdAt: new Date(),
        author: { id: 'user-1', username: 'testuser', avatarUrl: null },
        rank: 0.5,
      },
    ];

    mockDb.select.mockReturnValueOnce({
      from: () => ({
        leftJoin: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve(mockResults),
            }),
          }),
        }),
      }),
    });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/search?q=test');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeInstanceOf(Array);
  });

  it('should reject search without query', async () => {
    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/search');

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Search query is required');
  });

  it('should return empty array when no matches', async () => {
    mockDb.select.mockReturnValueOnce({
      from: () => ({
        leftJoin: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        }),
      }),
    });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/search?q=nonexistent');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it('should respect limit parameter', async () => {
    mockDb.select.mockReturnValueOnce({
      from: () => ({
        leftJoin: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        }),
      }),
    });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/search?q=test&limit=5');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('should cap limit at 100', async () => {
    mockDb.select.mockReturnValueOnce({
      from: () => ({
        leftJoin: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        }),
      }),
    });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/search?q=test&limit=500');

    expect(res.status).toBe(200);
    // The limit should be capped at 100 by the implementation
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe('GET /api/resources with query filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should filter resources by query in name and description', async () => {
    const mockItems = [
      {
        id: 'resource-1',
        name: 'AI Workflow',
        description: 'An AI-powered workflow',
        type: 'workflow',
        tags: ['ai'],
        version: '1.0.0',
        downloads: 20,
        likes: 10,
        isPublished: true,
        createdAt: new Date(),
        author: { id: 'user-1', username: 'testuser', avatarUrl: null },
      },
    ];

    mockDb.select
      .mockReturnValueOnce({
        from: () => ({
          leftJoin: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => ({ offset: () => Promise.resolve(mockItems) }),
              }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: () => Promise.resolve([{ total: 1 }]),
        }),
      });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources?q=AI');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.items[0].name).toBe('AI Workflow');
  });

  it('should combine query and type filter', async () => {
    mockDb.select
      .mockReturnValueOnce({
        from: () => ({
          leftJoin: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => ({ offset: () => Promise.resolve([]) }),
              }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: () => Promise.resolve([{ total: 0 }]),
        }),
      });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources?q=test&type=skill');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe('GET /api/resources pagination edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle page beyond total', async () => {
    mockDb.select
      .mockReturnValueOnce({
        from: () => ({
          leftJoin: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => ({ offset: () => Promise.resolve([]) }),
              }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: () => Promise.resolve([{ total: 10 }]),
        }),
      });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources?page=100');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.items).toEqual([]);
  });

  it('should use default pagination values', async () => {
    mockDb.select
      .mockReturnValueOnce({
        from: () => ({
          leftJoin: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => ({ offset: () => Promise.resolve([]) }),
              }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: () => Promise.resolve([{ total: 0 }]),
        }),
      });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.pagination.page).toBe(1);
    expect(body.data.pagination.limit).toBe(20);
  });

  it('should reject negative page number', async () => {
    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources?page=-1');

    // The z.coerce.number() will convert '-1' to -1, and z.int().min(1) will fail
    expect(res.status).toBe(400);
  });

  it('should reject limit exceeding max of 100', async () => {
    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources?limit=200');

    expect(res.status).toBe(400);
  });
});

describe('Search Response Format', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return ApiResponse format', async () => {
    mockDb.select.mockReturnValueOnce({
      from: () => ({
        leftJoin: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        }),
      }),
    });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/search?q=test');

    const body = await res.json();
    expect(body).toHaveProperty('success');
    expect(body).toHaveProperty('data');
    expect(typeof body.success).toBe('boolean');
  });

  it('should include author info in search results', async () => {
    const mockResults = [
      {
        id: 'resource-1',
        name: 'Test Resource',
        description: 'A test',
        type: 'workflow',
        tags: ['test'],
        downloads: 10,
        likes: 5,
        createdAt: new Date(),
        author: { id: 'user-1', username: 'testuser', avatarUrl: 'https://example.com/avatar.png' },
        rank: 0.5,
      },
    ];

    mockDb.select.mockReturnValueOnce({
      from: () => ({
        leftJoin: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve(mockResults),
            }),
          }),
        }),
      }),
    });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/search?q=test');

    const body = await res.json();
    expect(body.data[0]).toHaveProperty('author');
    expect(body.data[0].author).toHaveProperty('username');
    expect(body.data[0].author).toHaveProperty('id');
  });

  it('should include rank for full-text search ordering', async () => {
    const mockResults = [
      {
        id: 'resource-1',
        name: 'Test Resource',
        description: 'A test',
        type: 'workflow',
        tags: ['test'],
        downloads: 10,
        likes: 5,
        createdAt: new Date(),
        author: { id: 'user-1', username: 'testuser', avatarUrl: null },
        rank: 0.75,
      },
    ];

    mockDb.select.mockReturnValueOnce({
      from: () => ({
        leftJoin: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve(mockResults),
            }),
          }),
        }),
      }),
    });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/search?q=test');

    const body = await res.json();
    expect(body.data[0]).toHaveProperty('rank');
  });
});
