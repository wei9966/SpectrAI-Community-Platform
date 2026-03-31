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
  MINIO_ENDPOINT: 'localhost',
  MINIO_PORT: 9000,
  MINIO_ACCESS_KEY: 'test-access-key',
  MINIO_SECRET_KEY: 'test-secret-key',
  MINIO_BUCKET: 'test-bucket',
  MINIO_USE_SSL: false,
};

// Mock modules - vi.mock is hoisted, must define everything inside factory
vi.mock('../config/env.js', () => ({
  getEnv: () => mockEnv,
}));

vi.mock('../lib/storage.js', () => ({
  getPresignedUploadUrl: vi.fn(async (key: string, contentType: string) =>
    `https://presigned-upload-url.example.com/${key}?content-type=${contentType}`
  ),
  getPublicUrl: vi.fn((key: string) => `https://public-url.example.com/${key}`),
  getPresignedDownloadUrl: vi.fn(async (key: string) =>
    `https://presigned-download-url.example.com/${key}`
  ),
  deleteObject: vi.fn(async () => {}),
}));

// Import after mocking
import uploadRoutes from '../routes/uploads.js';
import { getPresignedUploadUrl, getPublicUrl } from '../lib/storage.js';

// Test factory functions
function generateTestToken(userId: string, role = 'user') {
  return sign(
    { userId, username: 'testuser', role },
    mockEnv.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

describe('uploadRoutes', () => {
  let app: Hono;
  let validToken: string;

  beforeAll(async () => {
    // Setup test user if needed
  });

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/api/uploads', uploadRoutes);
    validToken = generateTestToken('user-1');
  });

  describe('POST /api/uploads/presign', () => {
    describe('authentication', () => {
      it('should reject presign request without authentication', async () => {
        const res = await app.request('/api/uploads/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: 'test.jpg', contentType: 'image/jpeg' }),
        });

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.success).toBe(false);
      });

      it('should reject presign request with invalid token', async () => {
        const res = await app.request('/api/uploads/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer invalid-token',
          },
          body: JSON.stringify({ filename: 'test.jpg', contentType: 'image/jpeg' }),
        });

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.success).toBe(false);
      });
    });

    describe('validation', () => {
      it('should reject presign without filename', async () => {
        const res = await app.request('/api/uploads/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ contentType: 'image/jpeg' }),
        });

        expect(res.status).toBe(400);
      });

      it('should reject presign with empty filename', async () => {
        const res = await app.request('/api/uploads/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ filename: '', contentType: 'image/jpeg' }),
        });

        expect(res.status).toBe(400);
      });

      it('should reject presign without contentType', async () => {
        const res = await app.request('/api/uploads/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ filename: 'test.jpg' }),
        });

        expect(res.status).toBe(400);
      });

      it('should reject presign with empty contentType', async () => {
        const res = await app.request('/api/uploads/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ filename: 'test.jpg', contentType: '' }),
        });

        expect(res.status).toBe(400);
      });

      it('should reject filename exceeding 255 characters', async () => {
        const res = await app.request('/api/uploads/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({
            filename: 'a'.repeat(256) + '.jpg',
            contentType: 'image/jpeg'
          }),
        });

        expect(res.status).toBe(400);
      });

      it('should reject contentType exceeding 100 characters', async () => {
        const res = await app.request('/api/uploads/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({
            filename: 'test.jpg',
            contentType: 'a'.repeat(101)
          }),
        });

        expect(res.status).toBe(400);
      });
    });

    describe('folder parameter', () => {
      it('should use default folder "uploads" when not specified', async () => {
        const res = await app.request('/api/uploads/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ filename: 'test.jpg', contentType: 'image/jpeg' }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.key).toMatch(/^uploads\/user-1\//);
      });

      it('should accept valid folder values: avatars, covers, uploads', async () => {
        for (const folder of ['avatars', 'covers', 'uploads']) {
          const res = await app.request('/api/uploads/presign', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${validToken}`,
            },
            body: JSON.stringify({ filename: 'test.jpg', contentType: 'image/jpeg', folder }),
          });

          expect(res.status).toBe(200);
          const body = await res.json();
          expect(body.data.key).toMatch(new RegExp(`^${folder}/user-1/`));
        }
      });

      it('should reject invalid folder value', async () => {
        const res = await app.request('/api/uploads/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({
            filename: 'test.jpg',
            contentType: 'image/jpeg',
            folder: 'invalid'
          }),
        });

        expect(res.status).toBe(400);
      });
    });

    describe('successful presign', () => {
      it('should generate presigned URL with unique key', async () => {
        const mockUploadUrl = 'https://presigned-upload-url.example.com/uploads/user-1/test.jpg';
        const mockPublicUrl = 'https://public-url.example.com/uploads/user-1/test.jpg';
        (getPresignedUploadUrl as any).mockResolvedValueOnce(mockUploadUrl);
        (getPublicUrl as any).mockReturnValueOnce(mockPublicUrl);

        const res = await app.request('/api/uploads/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ filename: 'test.jpg', contentType: 'image/jpeg' }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty('uploadUrl');
        expect(body.data).toHaveProperty('key');
        expect(body.data).toHaveProperty('publicUrl');
        expect(body.data.key).toMatch(/^uploads\/user-1\/\d+-[a-z0-9]+\.jpg$/);
      });

      it('should include userId in generated key for user isolation', async () => {
        const res = await app.request('/api/uploads/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ filename: 'avatar.png', contentType: 'image/png', folder: 'avatars' }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.key).toMatch(/^avatars\/user-1\//);
      });

      it('should generate unique key with timestamp and random string', async () => {
        const res1 = await app.request('/api/uploads/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ filename: 'test.jpg', contentType: 'image/jpeg' }),
        });

        const res2 = await app.request('/api/uploads/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ filename: 'test.jpg', contentType: 'image/jpeg' }),
        });

        expect(res1.status).toBe(200);
        expect(res2.status).toBe(200);

        const body1 = await res1.json();
        const body2 = await res2.json();

        // Keys should be different (unique timestamp/random)
        expect(body1.data.key).not.toBe(body2.data.key);
      });

      it('should call getPresignedUploadUrl with correct parameters', async () => {
        const res = await app.request('/api/uploads/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ filename: 'test.jpg', contentType: 'image/jpeg' }),
        });

        expect(res.status).toBe(200);
        expect(getPresignedUploadUrl).toHaveBeenCalledTimes(1);
        const [key, contentType] = (getPresignedUploadUrl as any).mock.calls[0];
        expect(contentType).toBe('image/jpeg');
      });

      it('should call getPublicUrl with the generated key', async () => {
        const res = await app.request('/api/uploads/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ filename: 'test.jpg', contentType: 'image/jpeg' }),
        });

        expect(res.status).toBe(200);
        expect(getPublicUrl).toHaveBeenCalledTimes(1);
        const [key] = (getPublicUrl as any).mock.calls[0];
        expect(key).toMatch(/^uploads\/user-1\//);
      });

      it('should preserve file extension in generated key', async () => {
        const res = await app.request('/api/uploads/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ filename: 'document.pdf', contentType: 'application/pdf' }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.key).toMatch(/\.pdf$/);
      });
    });
  });

  describe('POST /api/uploads/confirm', () => {
    describe('authentication', () => {
      it('should reject confirm request without authentication', async () => {
        const res = await app.request('/api/uploads/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'uploads/user-1/test.jpg' }),
        });

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.success).toBe(false);
      });

      it('should reject confirm request with invalid token', async () => {
        const res = await app.request('/api/uploads/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer invalid-token',
          },
          body: JSON.stringify({ key: 'uploads/user-1/test.jpg' }),
        });

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.success).toBe(false);
      });
    });

    describe('validation', () => {
      it('should reject confirm without key', async () => {
        const res = await app.request('/api/uploads/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({}),
        });

        expect(res.status).toBe(400);
      });

      it('should reject confirm with empty key', async () => {
        const res = await app.request('/api/uploads/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ key: '' }),
        });

        expect(res.status).toBe(400);
      });
    });

    describe('successful confirm', () => {
      it('should return confirmed key and public URL', async () => {
        const mockPublicUrl = 'https://public-url.example.com/uploads/user-1/test.jpg';
        (getPublicUrl as any).mockReturnValueOnce(mockPublicUrl);

        const res = await app.request('/api/uploads/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ key: 'uploads/user-1/test.jpg' }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.key).toBe('uploads/user-1/test.jpg');
        expect(body.data.url).toBe(mockPublicUrl);
      });

      it('should call getPublicUrl with the provided key', async () => {
        const testKey = 'avatars/user-2/avatar.png';
        const res = await app.request('/api/uploads/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ key: testKey }),
        });

        expect(res.status).toBe(200);
        expect(getPublicUrl).toHaveBeenCalledTimes(1);
        expect((getPublicUrl as any).mock.calls[0][0]).toBe(testKey);
      });

      it('should handle different folder paths in key', async () => {
        for (const key of [
          'avatars/user-1/photo.jpg',
          'covers/user-2/cover.png',
          'uploads/user-3/document.pdf',
        ]) {
          const res = await app.request('/api/uploads/confirm', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${validToken}`,
            },
            body: JSON.stringify({ key }),
          });

          expect(res.status).toBe(200);
          const body = await res.json();
          expect(body.data.key).toBe(key);
        }
      });
    });
  });
});
