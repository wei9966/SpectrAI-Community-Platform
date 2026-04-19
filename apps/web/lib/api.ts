// API 调用层 - 统一从 @spectrai-community/shared 导入
// 不要重复定义 API 客户端

import {
  resourcesApi as sharedResourcesApi,
  authApi as sharedAuthApi,
  searchApi as sharedSearchApi,
  usersApi as sharedUsersApi,
  fetchApi,
  ApiError,
} from '@spectrai-community/shared';

export {
  sharedResourcesApi as resourcesApi,
  sharedAuthApi as authApi,
  sharedSearchApi as searchApi,
  sharedUsersApi as usersApi,
  fetchApi,
  ApiError,
};

export type {
  ApiResponse,
  PaginatedResponse,
  SearchParams,
  AuthResponse,
  RegisterPendingResponse,
  PublicResource,
  PublicUser,
} from '@spectrai-community/shared';

const _apiRaw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
export const API_BASE_URL = _apiRaw.endsWith('/api') ? _apiRaw : `${_apiRaw.replace(/\/+$/, '')}/api`;

export const api = {
  resourcesApi: sharedResourcesApi,
  authApi: sharedAuthApi,
  searchApi: sharedSearchApi,
  usersApi: sharedUsersApi,

  async login(email: string, password: string) {
    return sharedAuthApi.login({ email, password });
  },

  async register(username: string, email: string, password: string, inviteCode?: string) {
    return sharedAuthApi.register({ username, email, password, inviteCode });
  },

  async verifyCode(email: string, code: string, username: string, inviteCode?: string) {
    return sharedAuthApi.verifyCode({ email, code, username, inviteCode });
  },

  async logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
    return Promise.resolve({ success: true, message: '已退出登录' });
  },

  async getCurrentUser() {
    return sharedAuthApi.me();
  },

  async getResources(params?: {
    type?: string;
    q?: string;
    query?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { q, ...rest } = params || {};
    return sharedResourcesApi.list({
      query: q || params?.query,
      ...rest,
    } as any);
  },

  async getResource(id: string) {
    return sharedResourcesApi.getById(id);
  },

  async createResource(data: any) {
    return sharedResourcesApi.create(data);
  },

  async updateResource(id: string, data: any) {
    return sharedResourcesApi.update(id, data);
  },

  async deleteResource(id: string) {
    return sharedResourcesApi.delete(id);
  },

  async likeResource(id: string) {
    return sharedResourcesApi.like(id);
  },

  async getComments(resourceId: string) {
    console.log('getComments not implemented', resourceId);
    return { success: true, data: [] };
  },

  async addComment(resourceId: string, content: string) {
    console.log('addComment not implemented', resourceId, content);
    return { success: true, data: {} };
  },

  async getUserByUsername(username: string) {
    return sharedUsersApi.getByUsername(username);
  },

  async getUserResources(username: string, params?: { page?: number; limit?: number }) {
    return sharedUsersApi.getResourcesByUsername(username, params as any);
  },
};

export function adaptPagination<T>(response: any): { items: T[]; total: number; page: number; pageSize: number; totalPages: number } {
  if (response?.data?.items && response?.data?.pagination) {
    return {
      items: response.data.items,
      total: response.data.pagination.total,
      page: response.data.pagination.page,
      pageSize: response.data.pagination.pageSize,
      totalPages: response.data.pagination.totalPages,
    };
  }
  return response?.data || response;
}
