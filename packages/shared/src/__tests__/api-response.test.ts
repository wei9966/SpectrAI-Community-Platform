import { describe, it, expect } from 'vitest';
import { ApiResponse, PaginatedResponse, LoginRequest, RegisterRequest, SearchParams } from '../types/api';

/**
 * API Response Format Tests
 *
 * Verifies that API response types conform to the shared type definitions.
 */

describe('ApiResponse format', () => {
  it('should have success field set to true for successful responses', () => {
    const response: ApiResponse<string> = {
      success: true,
      data: 'test data',
    };
    expect(response.success).toBe(true);
    expect(response.data).toBe('test data');
    expect(response.error).toBeUndefined();
  });

  it('should have success field set to false for error responses', () => {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Something went wrong',
    };
    expect(response.success).toBe(false);
    expect(response.error).toBe('Something went wrong');
    expect(response.data).toBeUndefined();
  });

  it('should not have both data and error fields', () => {
    const errorResponse: ApiResponse<string> = {
      success: false,
      error: 'Error message',
    };
    expect(errorResponse).not.toHaveProperty('data');
  });
});

describe('PaginatedResponse format', () => {
  it('should have pagination metadata', () => {
    const response: PaginatedResponse<string> = {
      success: true,
      data: ['item1', 'item2'],
      total: 100,
      page: 1,
      pageSize: 10,
    };
    expect(response.total).toBe(100);
    expect(response.page).toBe(1);
    expect(response.pageSize).toBe(10);
  });

  it('should have correct total calculation', () => {
    const response: PaginatedResponse<string> = {
      success: true,
      data: Array(10).fill('item'),
      total: 50,
      page: 2,
      pageSize: 10,
    };
    expect(response.data.length).toBe(10);
    expect(response.total).toBe(50);
  });
});

describe('LoginRequest format', () => {
  it('should require email and password', () => {
    const request: LoginRequest = {
      email: 'user@example.com',
      password: 'password123',
    };
    expect(request.email).toBe('user@example.com');
    expect(request.password).toBe('password123');
  });
});

describe('RegisterRequest format', () => {
  it('should require username, email, and password', () => {
    const request: RegisterRequest = {
      username: 'testuser',
      email: 'user@example.com',
      password: 'password123',
    };
    expect(request.username).toBe('testuser');
    expect(request.email).toBe('user@example.com');
    expect(request.password).toBe('password123');
  });
});

describe('SearchParams format', () => {
  it('should support pagination params', () => {
    const params: SearchParams = {
      page: 1,
      pageSize: 20,
    };
    expect(params.page).toBe(1);
    expect(params.pageSize).toBe(20);
  });

  it('should support query param', () => {
    const params: SearchParams = {
      query: 'workflow',
    };
    expect(params.query).toBe('workflow');
  });

  it('should support type filter', () => {
    const params: SearchParams = {
      type: 'workflow',
    };
    expect(params.type).toBe('workflow');
  });

  it('should support tags filter', () => {
    const params: SearchParams = {
      tags: ['ai', 'automation'],
    };
    expect(params.tags).toEqual(['ai', 'automation']);
  });

  it('should support authorId filter', () => {
    const params: SearchParams = {
      authorId: 'author-123',
    };
    expect(params.authorId).toBe('author-123');
  });

  it('should support sort params', () => {
    const params: SearchParams = {
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    expect(params.sortBy).toBe('createdAt');
    expect(params.sortOrder).toBe('desc');
  });

  it('should support all params combined', () => {
    const params: SearchParams = {
      query: 'test',
      type: 'skill',
      tags: ['tag1'],
      authorId: 'author-1',
      sortBy: 'likes',
      sortOrder: 'desc',
      page: 2,
      pageSize: 15,
    };
    expect(params.query).toBe('test');
    expect(params.type).toBe('skill');
    expect(params.tags).toEqual(['tag1']);
    expect(params.authorId).toBe('author-1');
    expect(params.sortBy).toBe('likes');
    expect(params.sortOrder).toBe('desc');
    expect(params.page).toBe(2);
    expect(params.pageSize).toBe(15);
  });
});

describe('Sort validation', () => {
  it('should accept valid sortBy values', () => {
    const validSortFields: SearchParams['sortBy'][] = ['createdAt', 'downloads', 'likes', 'name'];
    validSortFields.forEach((field) => {
      const params: SearchParams = { sortBy: field };
      expect(params.sortBy).toBe(field);
    });
  });

  it('should accept valid sortOrder values', () => {
    const validSortOrders: SearchParams['sortOrder'][] = ['asc', 'desc'];
    validSortOrders.forEach((order) => {
      const params: SearchParams = { sortOrder: order };
      expect(params.sortOrder).toBe(order);
    });
  });
});
