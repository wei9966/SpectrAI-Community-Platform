// API 调用层 - 统一从 @spectrai-community/shared 导入
// 不要重复定义 API 客户端

// 导入 shared 包的 API 客户端
import {
  resourcesApi as sharedResourcesApi,
  authApi as sharedAuthApi,
  searchApi as sharedSearchApi,
  usersApi as sharedUsersApi,
  fetchApi,
  ApiError,
} from '@spectrai-community/shared';

// 重新导出 API 客户端（用于直接使用）
export {
  sharedResourcesApi as resourcesApi,
  sharedAuthApi as authApi,
  sharedSearchApi as searchApi,
  sharedUsersApi as usersApi,
  fetchApi,
  ApiError,
};

// 重新导出常用类型
export type {
  ApiResponse,
  PaginatedResponse,
  SearchParams,
  AuthResponse,
  PublicResource,
  PublicUser,
} from '@spectrai-community/shared';

// API 基础 URL 配置（用于服务端组件）
const _apiRaw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
export const API_BASE_URL = _apiRaw.endsWith('/api') ? _apiRaw : `${_apiRaw.replace(/\/+$/, '')}/api`;

// 封装 api 对象（用于向后兼容）
export const api = {
  // API 客户端原始导出
  resourcesApi: sharedResourcesApi,
  authApi: sharedAuthApi,
  searchApi: sharedSearchApi,
  usersApi: sharedUsersApi,

  // 认证相关
  async login(email: string, password: string) {
    return sharedAuthApi.login({ email, password });
  },

  async register(username: string, email: string, password: string, inviteCode?: string) {
    return sharedAuthApi.register({ username, email, password, inviteCode });
  },

  // logout: 前端自行清除 token，不调用后端 API
  async logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
    return Promise.resolve({ success: true, message: '已退出登录' });
  },

  async getCurrentUser() {
    return sharedAuthApi.me();
  },

  // 资源相关（注意：后端搜索参数使用 `q`，shared 包使用 `query`）
  async getResources(params?: {
    type?: string;
    q?: string;
    query?: string;
    page?: number;
    pageSize?: number;
  }) {
    // 将 q 转换为 query 以匹配 shared 包的 SearchParams
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

  // 评论相关（暂无 API）
  async getComments(resourceId: string) {
    console.log('getComments not implemented', resourceId);
    return { success: true, data: [] };
  },

  async addComment(resourceId: string, content: string) {
    console.log('addComment not implemented', resourceId, content);
    return { success: true, data: {} };
  },

  // 用户相关
  async getUserByUsername(username: string) {
    return sharedUsersApi.getByUsername(username);
  },

  // 注意：后端分页返回格式为 { success: true, data: { items: [...], pagination: {...} } }
  // 与 shared 包 PaginatedResponse 格式不同，需要适配
  async getUserResources(username: string, params?: { page?: number; limit?: number }) {
    return sharedUsersApi.getResourcesByUsername(username, params as any);
  },
};

// 适配后端分页响应格式的辅助函数
// 后端返回：{ success: true, data: { items: [...], pagination: { page, limit, total, totalPages } } }
// 前端期望：{ items: [...], total, page, pageSize, totalPages }
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
  // 如果是标准格式，直接返回
  return response?.data || response;
}
