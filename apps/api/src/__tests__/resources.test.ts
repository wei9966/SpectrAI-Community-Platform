import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { sign } from 'jsonwebtoken';

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

const createTestToken = (payload = { userId: 'user-1', username: 'testuser', role: 'user' }) => {
  return sign(payload, mockEnv.JWT_SECRET, { expiresIn: '7d' });
};

const mockResource = {
  id: 'resource-1',
  name: 'Test Workflow',
  description: 'A test workflow description',
  type: 'workflow' as const,
  content: { name: 'Test', description: 'Test', version: '1.0.0', steps: [] },
  authorId: 'user-1',
  downloads: 10,
  likes: 5,
  tags: ['test'],
  version: '1.0.0',
  isPublished: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUser = {
  id: 'user-1',
  username: 'testuser',
  avatarUrl: null,
  bio: null,
  createdAt: new Date(),
};

describe('GET /api/resources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return paginated list of resources', async () => {
    const mockItems = [
      {
        id: 'resource-1',
        name: 'Test Resource',
        description: 'A test resource',
        type: 'workflow',
        tags: ['test'],
        version: '1.0.0',
        downloads: 10,
        likes: 5,
        isPublished: true,
        createdAt: new Date(),
        author: { id: 'user-1', username: 'testuser', avatarUrl: null },
      },
    ];

    mockDb.select
      .mockReturnValueOnce({ // items query
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
      .mockReturnValueOnce({ // count query
        from: () => ({
          where: () => Promise.resolve([{ total: 1 }]),
        }),
      });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('items');
    expect(body.data).toHaveProperty('pagination');
    expect(Array.isArray(body.data.items)).toBe(true);
  });

  it('should return correct pagination metadata', async () => {
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
          where: () => Promise.resolve([{ total: 50 }]),
        }),
      });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources?page=2&limit=10');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.pagination.page).toBe(2);
    expect(body.data.pagination.limit).toBe(10);
    expect(body.data.pagination.total).toBe(50);
    expect(body.data.pagination.totalPages).toBe(5);
  });

  it('should filter resources by type', async () => {
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

    const res = await app.request('/api/resources?type=skill');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('should sort resources by latest by default', async () => {
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
    expect(body.success).toBe(true);
  });

  it('should sort resources by popular', async () => {
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

    const res = await app.request('/api/resources?sort=popular');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('should filter resources by search query', async () => {
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

    const res = await app.request('/api/resources?q=workflow');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe('GET /api/resources/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return resource by id', async () => {
    mockDb.select
      .mockReturnValueOnce({
        from: () => ({
          leftJoin: () => ({
            where: () => Promise.resolve([{
              id: 'resource-1',
              name: 'Test Resource',
              description: 'A test resource',
              type: 'workflow',
              content: {},
              tags: ['test'],
              version: '1.0.0',
              downloads: 10,
              likes: 5,
              isPublished: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              author: { id: 'user-1', username: 'testuser', avatarUrl: null, bio: null },
            }]),
          }),
        }),
      })
      .mockReturnValueOnce({ update: () => ({ where: () => Promise.resolve([]) }) });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/resource-1');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('resource-1');
    expect(body.data).toHaveProperty('author');
    expect(body.data.author).toHaveProperty('username');
  });

  it('should return 404 for non-existent resource', async () => {
    mockDb.select.mockReturnValueOnce({
      from: () => ({
        leftJoin: () => ({
          where: () => Promise.resolve([]),
        }),
      }),
    });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/non-existent-id');

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Resource not found');
  });
});

describe('POST /api/resources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new resource with valid data', async () => {
    const token = createTestToken();
    const newResource = {
      id: 'new-resource-id',
      name: 'New Resource',
      description: 'A new resource',
      type: 'workflow',
      authorId: 'user-1',
      tags: [],
      version: '1.0.0',
      isPublished: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockDb.insert.mockReturnValue({ values: () => Promise.resolve({ returning: () => Promise.resolve([newResource]) }) });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'New Resource',
        description: 'A new resource',
        type: 'workflow',
        tags: [],
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('New Resource');
  });

  it('should reject creation without authentication', async () => {
    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Resource',
        type: 'workflow',
      }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Authentication required');
  });

  it('should reject creation with missing required fields', async () => {
    const token = createTestToken();

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        description: 'Missing name and type',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('should reject creation with invalid resource type', async () => {
    const token = createTestToken();

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Invalid Resource',
        type: 'invalid-type',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('should reject creation with name exceeding 200 characters', async () => {
    const token = createTestToken();

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'a'.repeat(201),
        type: 'workflow',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});

describe('PUT /api/resources/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update resource by author', async () => {
    const token = createTestToken();
    const updatedResource = { ...mockResource, name: 'Updated Name' };

    mockDb.select.mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([mockResource]) }) });
    mockDb.update.mockReturnValue({ set: () => ({ where: () => ({ returning: () => Promise.resolve([updatedResource]) }) }) });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/resource-1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: 'Updated Name' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Updated Name');
  });

  it('should reject update by non-author', async () => {
    const differentUserToken = createTestToken({ userId: 'different-user', username: 'other', role: 'user' });

    mockDb.select.mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([mockResource]) }) });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/resource-1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${differentUserToken}`,
      },
      body: JSON.stringify({ name: 'Hacked Name' }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Not authorized to update this resource');
  });

  it('should reject update without authentication', async () => {
    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/resource-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name' }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('should return 404 for non-existent resource', async () => {
    const token = createTestToken();

    mockDb.select.mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([]) }) });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/non-existent', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: 'Updated Name' }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Resource not found');
  });
});

describe('DELETE /api/resources/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete resource by author', async () => {
    const token = createTestToken();

    mockDb.select.mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([mockResource]) }) });
    mockDb.delete.mockReturnValue({ where: () => Promise.resolve([]) });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/resource-1', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('should reject delete by non-author', async () => {
    const differentUserToken = createTestToken({ userId: 'different-user', username: 'other', role: 'user' });

    mockDb.select.mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([mockResource]) }) });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/resource-1', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${differentUserToken}` },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('should allow admin to delete any resource', async () => {
    const adminToken = createTestToken({ userId: 'admin-user', username: 'admin', role: 'admin' });

    mockDb.select.mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([mockResource]) }) });
    mockDb.delete.mockReturnValue({ where: () => Promise.resolve([]) });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/resource-1', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('should reject delete without authentication', async () => {
    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/resource-1', {
      method: 'DELETE',
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});

describe('POST /api/resources/:id/like', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add like to resource', async () => {
    const token = createTestToken();

    mockDb.select
      .mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([mockResource]) }) }) // resource exists
      .mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([]) }) }); // no existing like
    mockDb.insert.mockReturnValue({ values: () => Promise.resolve({ returning: () => Promise.resolve([{}]) }) });
    mockDb.update.mockReturnValue({ set: () => ({ where: () => Promise.resolve([]) }) });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/resource-1/like', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.liked).toBe(true);
  });

  it('should remove like when already liked (toggle)', async () => {
    const token = createTestToken();
    const existingLike = { id: 'like-1', resourceId: 'resource-1', userId: 'user-1' };

    mockDb.select
      .mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([mockResource]) }) }) // resource exists
      .mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([existingLike]) }) }); // existing like
    mockDb.delete.mockReturnValue({ where: () => Promise.resolve([]) });
    mockDb.update.mockReturnValue({ set: () => ({ where: () => Promise.resolve([]) }) });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/resource-1/like', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.liked).toBe(false);
  });

  it('should reject like without authentication', async () => {
    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/resource-1/like', {
      method: 'POST',
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('should return 404 for non-existent resource', async () => {
    const token = createTestToken();

    mockDb.select.mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([]) }) });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/non-existent/like', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Resource not found');
  });
});

describe('GET /api/resources/:id/comments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return list of comments for resource', async () => {
    const mockComments = [
      {
        id: 'comment-1',
        content: 'Great resource!',
        createdAt: new Date(),
        user: { id: 'user-1', username: 'testuser', avatarUrl: null },
      },
    ];

    mockDb.select
      .mockReturnValueOnce({
        from: () => ({
          leftJoin: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => ({ offset: () => Promise.resolve(mockComments) }),
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

    const res = await app.request('/api/resources/resource-1/comments');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('items');
    expect(body.data).toHaveProperty('pagination');
    expect(body.data.items[0].content).toBe('Great resource!');
  });

  it('should return empty list when no comments exist', async () => {
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

    const res = await app.request('/api/resources/resource-1/comments');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.items).toEqual([]);
  });
});

describe('POST /api/resources/:id/comments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create comment on resource', async () => {
    const token = createTestToken();
    const newComment = {
      id: 'comment-new',
      resourceId: 'resource-1',
      userId: 'user-1',
      content: 'This is a comment',
      createdAt: new Date(),
    };

    mockDb.select.mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([{ id: 'resource-1' }]) }) });
    mockDb.insert.mockReturnValue({ values: () => Promise.resolve({ returning: () => Promise.resolve([newComment]) }) });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/resource-1/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: 'This is a comment' }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.content).toBe('This is a comment');
  });

  it('should reject comment without authentication', async () => {
    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/resource-1/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'This is a comment' }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('should reject comment with empty content', async () => {
    const token = createTestToken();

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/resource-1/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: '' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('should reject comment exceeding max length', async () => {
    const token = createTestToken();

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/resource-1/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: 'a'.repeat(2001) }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('should return 404 for non-existent resource', async () => {
    const token = createTestToken();

    mockDb.select.mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([]) }) });

    const app = new Hono();
    app.route('/api/resources', resourceRoutes);

    const res = await app.request('/api/resources/non-existent/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: 'This is a comment' }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Resource not found');
  });
});
