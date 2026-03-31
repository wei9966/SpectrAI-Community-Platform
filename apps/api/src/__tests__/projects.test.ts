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
  projects: {},
  projectResources: {},
  resources: {},
  users: {},
}));

// Import after mocking
import projectRoutes from '../routes/projects.js';
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
    role: 'admin' as const,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
];

const mockProjects = [
  {
    id: 'project-1',
    title: 'Test Project',
    description: 'A test project',
    coverImage: 'https://example.com/cover.jpg',
    demoUrl: 'https://example.com/demo',
    sourceUrl: 'https://github.com/example/project',
    toolChain: { languages: ['TypeScript', 'Python'], frameworks: ['React', 'FastAPI'] },
    tags: ['ai', 'workflow'],
    status: 'published' as const,
    userId: 'user-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    id: 'project-2',
    title: 'Another Project',
    description: 'Another test project',
    coverImage: null,
    demoUrl: null,
    sourceUrl: null,
    toolChain: null,
    tags: [],
    status: 'draft' as const,
    userId: 'user-1',
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
];

const mockProjectResources = [
  {
    id: 'link-1',
    projectId: 'project-1',
    resourceId: 'resource-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  },
];

// Test factory functions
function createMockProject(overrides?: Partial<typeof mockProjects[0]>) {
  return { ...mockProjects[0], ...overrides };
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

describe('projectRoutes', () => {
  let app: Hono;
  let validToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const testUser = { ...mockUsers[0], passwordHash: await hash('Password123!', 12) };
    mockUsers[0] = testUser;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/api/projects', projectRoutes);
    validToken = generateTestToken('user-1');
    adminToken = generateTestToken('user-2', 'admin');
  });

  describe('GET /api/projects', () => {
    describe('basic listing', () => {
      it('should return empty list when no projects exist', async () => {
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
        mockDb.select.mockReturnValueOnce({
          from: () => ({
            where: () => Promise.resolve([{ total: 0 }]),
          }),
        });

        const res = await app.request('/api/projects');

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.items).toEqual([]);
        expect(body.data.pagination).toEqual({
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        });
      });

      it('should return paginated list of published projects (default filter)', async () => {
        const mockProjectsList = [
          {
            id: 'project-1',
            title: 'Project 1',
            description: 'Desc 1',
            coverImage: null,
            demoUrl: null,
            sourceUrl: null,
            toolChain: null,
            tags: ['tag1'],
            status: 'published',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            author: { id: 'user-1', username: 'testuser', avatarUrl: null },
          },
          {
            id: 'project-2',
            title: 'Project 2',
            description: 'Desc 2',
            coverImage: null,
            demoUrl: null,
            sourceUrl: null,
            toolChain: null,
            tags: ['tag2'],
            status: 'published',
            createdAt: new Date('2026-01-02T00:00:00.000Z'),
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
            author: { id: 'user-1', username: 'testuser', avatarUrl: null },
          },
        ];

        mockDb.select.mockReturnValueOnce({
          from: () => ({
            leftJoin: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: () => Promise.resolve(mockProjectsList),
                }),
              }),
            }),
          }),
        });
        mockDb.select.mockReturnValueOnce({
          from: () => ({
            where: () => Promise.resolve([{ total: 2 }]),
          }),
        });

        const res = await app.request('/api/projects');

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.items).toHaveLength(2);
        expect(body.data.pagination.total).toBe(2);
        expect(body.data.pagination.totalPages).toBe(1);
      });

      it('should filter by status parameter', async () => {
        mockDb.select.mockReturnValueOnce({
          from: () => ({
            leftJoin: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: () => Promise.resolve([createMockProject({ status: 'draft' })]),
                }),
              }),
            }),
          }),
        });
        mockDb.select.mockReturnValueOnce({
          from: () => ({
            where: () => Promise.resolve([{ total: 1 }]),
          }),
        });

        const res = await app.request('/api/projects?status=draft');

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.items).toHaveLength(1);
      });

      it('should filter by userId parameter', async () => {
        mockDb.select.mockReturnValueOnce({
          from: () => ({
            leftJoin: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: () => Promise.resolve([createMockProject()]),
                }),
              }),
            }),
          }),
        });
        mockDb.select.mockReturnValueOnce({
          from: () => ({
            where: () => Promise.resolve([{ total: 1 }]),
          }),
        });

        const res = await app.request('/api/projects?userId=user-1');

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.items).toHaveLength(1);
      });

      it('should search by query parameter (q)', async () => {
        mockDb.select.mockReturnValueOnce({
          from: () => ({
            leftJoin: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: () => Promise.resolve([createMockProject()]),
                }),
              }),
            }),
          }),
        });
        mockDb.select.mockReturnValueOnce({
          from: () => ({
            where: () => Promise.resolve([{ total: 1 }]),
          }),
        });

        const res = await app.request('/api/projects?q=test');

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.items).toHaveLength(1);
      });

      it('should accept custom page and limit parameters', async () => {
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
        mockDb.select.mockReturnValueOnce({
          from: () => ({
            where: () => Promise.resolve([{ total: 50 }]),
          }),
        });

        const res = await app.request('/api/projects?page=2&limit=25');

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.pagination.page).toBe(2);
        expect(body.data.pagination.limit).toBe(25);
        expect(body.data.pagination.total).toBe(50);
        expect(body.data.pagination.totalPages).toBe(2);
      });

      it('should cap limit to maximum 100', async () => {
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
        mockDb.select.mockReturnValueOnce({
          from: () => ({
            where: () => Promise.resolve([{ total: 200 }]),
          }),
        });

        const res = await app.request('/api/projects?limit=500');

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.pagination.limit).toBe(100);
      });
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return project details with linked resources', async () => {
      const mockProjectDetail = {
        id: 'project-1',
        title: 'Test Project',
        description: 'A test project',
        coverImage: 'https://example.com/cover.jpg',
        demoUrl: 'https://example.com/demo',
        sourceUrl: 'https://github.com/example/project',
        toolChain: { languages: ['TypeScript'] },
        tags: ['ai'],
        status: 'published',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        author: { id: 'user-1', username: 'testuser', avatarUrl: null },
      };
      const mockLinkedResources = [
        {
          id: 'resource-1',
          name: 'Linked Resource',
          description: 'Resource desc',
          type: 'workflow',
          tags: ['tag1'],
          downloads: 100,
          likes: 50,
        },
      ];

      mockDb.select.mockReturnValueOnce({
        from: () => ({
          leftJoin: () => ({
            where: () => ({
              limit: () => Promise.resolve([mockProjectDetail]),
            }),
          }),
        }),
      });
      mockDb.select.mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => Promise.resolve(mockLinkedResources),
          }),
        }),
      });

      const res = await app.request('/api/projects/project-1');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('project-1');
      expect(body.data.resources).toHaveLength(1);
    });

    it('should return 404 for non-existent project', async () => {
      mockDb.select.mockReturnValueOnce({
        from: () => ({
          leftJoin: () => ({
            where: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        }),
      });

      const res = await app.request('/api/projects/non-existent');

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Project not found');
    });
  });

  describe('POST /api/projects', () => {
    describe('authentication', () => {
      it('should reject project creation without authentication', async () => {
        const res = await app.request('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Test Project' }),
        });

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.success).toBe(false);
      });

      it('should reject project creation with invalid token', async () => {
        const res = await app.request('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer invalid-token',
          },
          body: JSON.stringify({ title: 'Test Project' }),
        });

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.success).toBe(false);
      });
    });

    describe('validation', () => {
      it('should reject project without title', async () => {
        const res = await app.request('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({}),
        });

        expect(res.status).toBe(400);
      });

      it('should reject project with empty title', async () => {
        const res = await app.request('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ title: '' }),
        });

        expect(res.status).toBe(400);
      });

      it('should reject project with title exceeding 200 characters', async () => {
        const res = await app.request('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ title: 'a'.repeat(201) }),
        });

        expect(res.status).toBe(400);
      });
    });

    describe('successful creation', () => {
      it('should create project with minimal fields', async () => {
        const insertMock = createMockQueryBuilder();
        (mockDb.insert as any).mockReturnValueOnce(insertMock);
        insertMock.values.mockReturnValueOnce(insertMock);
        insertMock.returning.mockResolvedValueOnce([createMockProject()]);

        const res = await app.request('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ title: 'Test Project' }),
        });

        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.title).toBe('Test Project');
      });

      it('should create project with all fields including toolChain (jsonb) and tags (text[])', async () => {
        const insertMock = createMockQueryBuilder();
        (mockDb.insert as any).mockReturnValueOnce(insertMock);
        insertMock.values.mockReturnValueOnce(insertMock);
        insertMock.returning.mockResolvedValueOnce([
          createMockProject({
            toolChain: { languages: ['TypeScript', 'Python'], frameworks: ['React'] },
            tags: ['ai', 'workflow'],
          }),
        ]);

        const res = await app.request('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({
            title: 'Full Project',
            description: 'Description',
            coverImage: 'https://example.com/cover.jpg',
            demoUrl: 'https://example.com/demo',
            sourceUrl: 'https://github.com/example',
            toolChain: { languages: ['TypeScript', 'Python'], frameworks: ['React'] },
            tags: ['ai', 'workflow'],
            status: 'draft',
          }),
        });

        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.toolChain).toEqual({ languages: ['TypeScript', 'Python'], frameworks: ['React'] });
        expect(body.data.tags).toEqual(['ai', 'workflow']);
      });
    });
  });

  describe('PUT /api/projects/:id', () => {
    describe('authentication', () => {
      it('should reject update without authentication', async () => {
        const res = await app.request('/api/projects/project-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Updated' }),
        });

        expect(res.status).toBe(401);
      });
    });

    describe('authorization', () => {
      it('should reject update by non-owner', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit.mockResolvedValueOnce([createMockProject({ userId: 'user-2' })]);

        const res = await app.request('/api/projects/project-1', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ title: 'Updated' }),
        });

        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.error).toBe('Not authorized to update this project');
      });
    });

    describe('project existence', () => {
      it('should return 404 for non-existent project', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit.mockResolvedValueOnce([]);

        const res = await app.request('/api/projects/non-existent', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ title: 'Updated' }),
        });

        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.error).toBe('Project not found');
      });
    });

    describe('successful update', () => {
      it('should update project by owner', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit.mockResolvedValueOnce([createMockProject({ userId: 'user-1' })]);

        const updateMock = createMockQueryBuilder();
        (mockDb.update as any).mockReturnValueOnce(updateMock);
        updateMock.set.mockReturnValueOnce(updateMock);
        updateMock.where.mockReturnValueOnce(updateMock);
        updateMock.returning.mockResolvedValueOnce([
          createMockProject({ title: 'Updated Title', userId: 'user-1' }),
        ]);

        const res = await app.request('/api/projects/project-1', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ title: 'Updated Title' }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.title).toBe('Updated Title');
      });

      it('should allow admin to update any project', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit.mockResolvedValueOnce([createMockProject({ userId: 'user-1' })]);

        const updateMock = createMockQueryBuilder();
        (mockDb.update as any).mockReturnValueOnce(updateMock);
        updateMock.set.mockReturnValueOnce(updateMock);
        updateMock.where.mockReturnValueOnce(updateMock);
        updateMock.returning.mockResolvedValueOnce([
          createMockProject({ title: 'Admin Updated', userId: 'user-1' }),
        ]);

        const res = await app.request('/api/projects/project-1', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ title: 'Admin Updated' }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
      });
    });
  });

  describe('DELETE /api/projects/:id', () => {
    describe('authentication', () => {
      it('should reject delete without authentication', async () => {
        const res = await app.request('/api/projects/project-1', {
          method: 'DELETE',
        });

        expect(res.status).toBe(401);
      });
    });

    describe('authorization', () => {
      it('should reject delete by non-owner', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit.mockResolvedValueOnce([createMockProject({ userId: 'user-2' })]);

        const res = await app.request('/api/projects/project-1', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        });

        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.error).toBe('Not authorized to delete this project');
      });

      it('should allow admin to delete any project', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit.mockResolvedValueOnce([createMockProject({ userId: 'user-1' })]);

        const deleteMock = createMockQueryBuilder();
        (mockDb.delete as any).mockReturnValueOnce(deleteMock);
        deleteMock.where.mockReturnValueOnce(deleteMock);
        deleteMock.mockResolvedValueOnce({});

        const res = await app.request('/api/projects/project-1', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
      });
    });

    describe('project existence', () => {
      it('should return 404 for non-existent project', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit.mockResolvedValueOnce([]);

        const res = await app.request('/api/projects/non-existent', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        });

        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.error).toBe('Project not found');
      });
    });

    describe('successful delete', () => {
      it('should delete project by owner', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit.mockResolvedValueOnce([createMockProject({ userId: 'user-1' })]);

        const deleteMock = createMockQueryBuilder();
        (mockDb.delete as any).mockReturnValueOnce(deleteMock);
        deleteMock.where.mockReturnValueOnce(deleteMock);
        deleteMock.mockResolvedValueOnce({});

        const res = await app.request('/api/projects/project-1', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.message).toBe('Project deleted');
      });
    });
  });

  describe('POST /api/projects/:id/resources', () => {
    describe('authentication', () => {
      it('should reject link without authentication', async () => {
        const res = await app.request('/api/projects/project-1/resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resourceId: 'resource-1' }),
        });

        expect(res.status).toBe(401);
      });
    });

    describe('validation', () => {
      it('should reject link without resourceId', async () => {
        const res = await app.request('/api/projects/project-1/resources', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({}),
        });

        expect(res.status).toBe(400);
      });
    });

    describe('project existence', () => {
      it('should return 404 for non-existent project', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit.mockResolvedValueOnce([]);

        const res = await app.request('/api/projects/non-existent/resources', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ resourceId: 'resource-1' }),
        });

        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.error).toBe('Project not found');
      });
    });

    describe('authorization', () => {
      it('should reject link by non-owner', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit.mockResolvedValueOnce([createMockProject({ userId: 'user-2' })]);

        const res = await app.request('/api/projects/project-1/resources', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ resourceId: 'resource-1' }),
        });

        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.error).toBe('Not authorized');
      });
    });

    describe('resource existence', () => {
      it('should return 404 for non-existent resource', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit.mockResolvedValueOnce([createMockProject({ userId: 'user-1' })]);

        const secondCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(secondCallMock);
        secondCallMock.from.mockReturnValueOnce(secondCallMock);
        secondCallMock.where.mockReturnValueOnce(secondCallMock);
        secondCallMock.limit.mockResolvedValueOnce([]);

        const res = await app.request('/api/projects/project-1/resources', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ resourceId: 'non-existent' }),
        });

        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.error).toBe('Resource not found');
      });
    });

    describe('duplicate link', () => {
      it('should return 409 if resource already linked', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit.mockResolvedValueOnce([createMockProject({ userId: 'user-1' })]);

        const secondCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(secondCallMock);
        secondCallMock.from.mockReturnValueOnce(secondCallMock);
        secondCallMock.where.mockReturnValueOnce(secondCallMock);
        secondCallMock.limit.mockResolvedValueOnce([createMockResource()]);

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit.mockResolvedValueOnce([mockProjectResources[0]]);

        const res = await app.request('/api/projects/project-1/resources', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ resourceId: 'resource-1' }),
        });

        expect(res.status).toBe(409);
        const body = await res.json();
        expect(body.error).toBe('Resource already linked to this project');
      });
    });

    describe('successful linking', () => {
      it('should link resource to project', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit.mockResolvedValueOnce([createMockProject({ userId: 'user-1' })]);

        const secondCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(secondCallMock);
        secondCallMock.from.mockReturnValueOnce(secondCallMock);
        secondCallMock.where.mockReturnValueOnce(secondCallMock);
        secondCallMock.limit.mockResolvedValueOnce([createMockResource()]);

        const thirdCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(thirdCallMock);
        thirdCallMock.from.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.where.mockReturnValueOnce(thirdCallMock);
        thirdCallMock.limit.mockResolvedValueOnce([]);

        const insertMock = createMockQueryBuilder();
        (mockDb.insert as any).mockReturnValueOnce(insertMock);
        insertMock.values.mockReturnValueOnce(insertMock);
        insertMock.returning.mockResolvedValueOnce([mockProjectResources[0]]);

        const res = await app.request('/api/projects/project-1/resources', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ resourceId: 'resource-1' }),
        });

        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.projectId).toBe('project-1');
        expect(body.data.resourceId).toBe('resource-1');
      });
    });
  });

  describe('DELETE /api/projects/:id/resources/:resourceId', () => {
    describe('authentication', () => {
      it('should reject unlink without authentication', async () => {
        const res = await app.request('/api/projects/project-1/resources/resource-1', {
          method: 'DELETE',
        });

        expect(res.status).toBe(401);
      });
    });

    describe('project existence', () => {
      it('should return 404 for non-existent project', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit.mockResolvedValueOnce([]);

        const res = await app.request('/api/projects/non-existent/resources/resource-1', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        });

        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.error).toBe('Project not found');
      });
    });

    describe('authorization', () => {
      it('should reject unlink by non-owner', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit.mockResolvedValueOnce([createMockProject({ userId: 'user-2' })]);

        const res = await app.request('/api/projects/project-1/resources/resource-1', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        });

        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.error).toBe('Not authorized');
      });
    });

    describe('link existence', () => {
      it('should return 404 for non-existent link', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit.mockResolvedValueOnce([createMockProject({ userId: 'user-1' })]);

        const secondCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(secondCallMock);
        secondCallMock.from.mockReturnValueOnce(secondCallMock);
        secondCallMock.where.mockReturnValueOnce(secondCallMock);
        secondCallMock.limit.mockResolvedValueOnce([]);

        const res = await app.request('/api/projects/project-1/resources/resource-1', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        });

        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.error).toBe('Link not found');
      });
    });

    describe('successful unlinking', () => {
      it('should unlink resource from project', async () => {
        const firstCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(firstCallMock);
        firstCallMock.from.mockReturnValueOnce(firstCallMock);
        firstCallMock.where.mockReturnValueOnce(firstCallMock);
        firstCallMock.limit.mockResolvedValueOnce([createMockProject({ userId: 'user-1' })]);

        const secondCallMock = createMockQueryBuilder();
        (mockDb.select as any).mockReturnValueOnce(secondCallMock);
        secondCallMock.from.mockReturnValueOnce(secondCallMock);
        secondCallMock.where.mockReturnValueOnce(secondCallMock);
        secondCallMock.limit.mockResolvedValueOnce([mockProjectResources[0]]);

        const deleteMock = createMockQueryBuilder();
        (mockDb.delete as any).mockReturnValueOnce(deleteMock);
        deleteMock.where.mockReturnValueOnce(deleteMock);
        deleteMock.mockResolvedValueOnce({});

        const res = await app.request('/api/projects/project-1/resources/resource-1', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.message).toBe('Resource unlinked from project');
      });
    });
  });
});
