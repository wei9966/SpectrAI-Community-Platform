import type { ApiResponse, PaginatedResponse, LoginRequest, RegisterRequest, AuthResponse, SearchParams, PaginationInfo } from './types/api';
import type { Resource, PublicResource, CreateResourceInput, UpdateResourceInput, ResourceType } from './types/resource';
import type { User, PublicUser, UpdateUserInput } from './types/user';
import type { PostStatus, ReviewPostInput } from './types/forum';

// API base URL - use environment variable or default to localhost
const API_BASE_URL = typeof process !== 'undefined'
  ? (process.env?.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api')
  : (window?.location?.origin + '/api' || 'http://localhost:3001/api');

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Base fetch wrapper with unified error handling
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  // Build headers object properly
  const initHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Merge with any provided headers
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        initHeaders[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        initHeaders[key] = value;
      });
    } else {
      Object.assign(initHeaders, options.headers);
    }
  }

  // Add auth token if available (client-side only)
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      (initHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: initHeaders,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error || 'An error occurred',
        response.status,
        data.code
      );
    }

    return data as ApiResponse<T>;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error', 0);
  }
}

/**
 * Resources API client
 */
export const resourcesApi = {
  async list(params?: SearchParams): Promise<PaginatedResponse<PublicResource>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, v));
          } else {
            searchParams.append(key, String(value));
          }
        }
      });
    }
    // Backend returns: { success: true, data: { items: T[], pagination: {...} } }
    return fetchApi<{ items: PublicResource[]; pagination: PaginationInfo }>(`/resources?${searchParams}`) as Promise<PaginatedResponse<PublicResource>>;
  },

  async getById(id: string): Promise<ApiResponse<PublicResource>> {
    return fetchApi<PublicResource>(`/resources/${id}`);
  },

  async getByType(type: ResourceType, params?: SearchParams): Promise<PaginatedResponse<PublicResource>> {
    const searchParams = new URLSearchParams({ type });
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'type') {
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, v));
          } else {
            searchParams.append(key, String(value));
          }
        }
      });
    }
    return fetchApi<{ items: PublicResource[]; pagination: PaginationInfo }>(`/resources?${searchParams}`) as Promise<PaginatedResponse<PublicResource>>;
  },

  async create(input: CreateResourceInput): Promise<ApiResponse<Resource>> {
    return fetchApi<Resource>('/resources', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async update(id: string, input: UpdateResourceInput): Promise<ApiResponse<Resource>> {
    return fetchApi<Resource>(`/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return fetchApi<void>(`/resources/${id}`, {
      method: 'DELETE',
    });
  },

  async like(id: string): Promise<ApiResponse<{ liked: boolean }>> {
    return fetchApi<{ liked: boolean }>(`/resources/${id}/like`, {
      method: 'POST',
    });
  },

  async rate(id: string, rating: number): Promise<ApiResponse<{ rating: number; averageRating: number; ratingCount: number }>> {
    return fetchApi<{ rating: number; averageRating: number; ratingCount: number }>(`/resources/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    });
  },

  async favorite(id: string): Promise<ApiResponse<{ favorited: boolean }>> {
    return fetchApi<{ favorited: boolean }>(`/resources/${id}/favorite`, {
      method: 'POST',
    });
  },
};

/**
 * Auth API client
 */
export const authApi = {
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return fetchApi<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    return fetchApi<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async github(code: string): Promise<ApiResponse<AuthResponse>> {
    return fetchApi<AuthResponse>('/auth/github', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  async me(): Promise<ApiResponse<User>> {
    return fetchApi<User>('/auth/me');
  },

  // Note: logout endpoint not implemented in backend, client should clear token locally
};

/**
 * Search API client
 */
export const searchApi = {
  async search(query: string, params?: SearchParams): Promise<PaginatedResponse<PublicResource>> {
    const searchParams = new URLSearchParams({ q: query });
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'query') {
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, v));
          } else {
            searchParams.append(key, String(value));
          }
        }
      });
    }
    return fetchApi<{ items: PublicResource[]; pagination: PaginationInfo }>(`/resources/search?${searchParams}`) as Promise<PaginatedResponse<PublicResource>>;
  },
};

/**
 * Users API client
 * Note: backend uses username for queries, not id
 */
export const usersApi = {
  async getByUsername(username: string): Promise<ApiResponse<PublicUser>> {
    return fetchApi<PublicUser>(`/users/${encodeURIComponent(username)}`);
  },

  async getResourcesByUsername(username: string, params?: SearchParams): Promise<PaginatedResponse<PublicResource>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, v));
          } else {
            searchParams.append(key, String(value));
          }
        }
      });
    }
    return fetchApi<{ items: PublicResource[]; pagination: PaginationInfo }>(`/users/${encodeURIComponent(username)}/resources?${searchParams}`) as Promise<PaginatedResponse<PublicResource>>;
  },

  async updateProfile(username: string, input: UpdateUserInput): Promise<ApiResponse<PublicUser>> {
    return fetchApi<PublicUser>(`/users/${encodeURIComponent(username)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  async getStats(userId: string): Promise<ApiResponse<{ totalDownloads: number; totalLikes: number; averageRating: number; resourceCount: number; daysSinceJoining: number }>> {
    return fetchApi(`/users/${userId}/stats`);
  },

  async getActivity(userId: string, limit?: number): Promise<ApiResponse<Array<{ type: string; relatedId: string; title: string; createdAt: string }>>> {
    const params = limit ? `?limit=${limit}` : '';
    return fetchApi(`/users/${userId}/activity${params}`);
  },

  async getLikes(userId: string, page?: number, limit?: number): Promise<PaginatedResponse<PublicResource>> {
    const searchParams = new URLSearchParams();
    if (page) searchParams.set('page', String(page));
    if (limit) searchParams.set('limit', String(limit));
    return fetchApi<{ items: PublicResource[]; pagination: PaginationInfo }>(`/users/${userId}/likes?${searchParams}`) as Promise<PaginatedResponse<PublicResource>>;
  },

  async getComments(userId: string, page?: number, limit?: number): Promise<PaginatedResponse<{ id: string; content: string; createdAt: string; resource: { id: string; name: string; type: string } }>> {
    const searchParams = new URLSearchParams();
    if (page) searchParams.set('page', String(page));
    if (limit) searchParams.set('limit', String(limit));
    return fetchApi<{ items: Array<{ id: string; content: string; createdAt: string; resource: { id: string; name: string; type: string } }>; pagination: PaginationInfo }>(`/users/${userId}/comments?${searchParams}`) as Promise<PaginatedResponse<{ id: string; content: string; createdAt: string; resource: { id: string; name: string; type: string } }>>;
  },

  async getFavorites(userId: string, page?: number, limit?: number): Promise<PaginatedResponse<PublicResource>> {
    const searchParams = new URLSearchParams();
    if (page) searchParams.set('page', String(page));
    if (limit) searchParams.set('limit', String(limit));
    return fetchApi<{ items: PublicResource[]; pagination: PaginationInfo }>(`/users/${userId}/favorites?${searchParams}`) as Promise<PaginatedResponse<PublicResource>>;
  },
};

/**
 * Projects API client
 */
export interface ProjectInput {
  title: string;
  description?: string;
  coverImage?: string;
  demoUrl?: string;
  sourceUrl?: string;
  toolChain?: unknown;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
}

export interface ProjectItem {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  demoUrl: string | null;
  sourceUrl: string | null;
  toolChain: unknown;
  tags: string[] | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; username: string; avatarUrl: string | null };
}

export const projectsApi = {
  async list(params?: { page?: number; limit?: number; status?: string; q?: string; userId?: string }): Promise<PaginatedResponse<ProjectItem>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    return fetchApi<{ items: ProjectItem[]; pagination: PaginationInfo }>(`/projects?${searchParams}`) as Promise<PaginatedResponse<ProjectItem>>;
  },

  async getById(id: string): Promise<ApiResponse<ProjectItem & { resources: Array<{ id: string; name: string; description: string; type: string; tags: string[] | null; downloads: number; likes: number }> }>> {
    return fetchApi(`/projects/${id}`);
  },

  async create(input: ProjectInput): Promise<ApiResponse<ProjectItem>> {
    return fetchApi<ProjectItem>('/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async update(id: string, input: Partial<ProjectInput>): Promise<ApiResponse<ProjectItem>> {
    return fetchApi<ProjectItem>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return fetchApi<void>(`/projects/${id}`, {
      method: 'DELETE',
    });
  },

  async linkResource(projectId: string, resourceId: string): Promise<ApiResponse<{ id: string; projectId: string; resourceId: string }>> {
    return fetchApi(`/projects/${projectId}/resources`, {
      method: 'POST',
      body: JSON.stringify({ resourceId }),
    });
  },

  async unlinkResource(projectId: string, resourceId: string): Promise<ApiResponse<void>> {
    return fetchApi<void>(`/projects/${projectId}/resources/${resourceId}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Uploads API client
 */
export const uploadsApi = {
  async presign(filename: string, contentType: string, folder?: 'avatars' | 'covers' | 'uploads'): Promise<ApiResponse<{ uploadUrl: string; key: string; publicUrl: string }>> {
    return fetchApi('/uploads/presign', {
      method: 'POST',
      body: JSON.stringify({ filename, contentType, folder: folder || 'uploads' }),
    });
  },

  async confirm(key: string): Promise<ApiResponse<{ key: string; url: string }>> {
    return fetchApi('/uploads/confirm', {
      method: 'POST',
      body: JSON.stringify({ key }),
    });
  },
};

/**
 * Rankings API client
 */
export const rankingsApi = {
  async getResources(params?: { period?: string; sort?: string; limit?: number }): Promise<ApiResponse<{ items: unknown[]; period: string; sort: string; cachedAt: string }>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return fetchApi(`/rankings/resources?${searchParams}`);
  },

  async getUsers(params?: { period?: string; sort?: string; limit?: number }): Promise<ApiResponse<{ items: unknown[]; period: string; sort: string; cachedAt: string }>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return fetchApi(`/rankings/users?${searchParams}`);
  },

  async getProjects(params?: { limit?: number }): Promise<ApiResponse<{ items: unknown[]; cachedAt: string }>> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    return fetchApi(`/rankings/projects?${searchParams}`);
  },

  async refresh(): Promise<ApiResponse<{ message: string }>> {
    return fetchApi('/rankings/refresh', { method: 'POST' });
  },
};

/**
 * Notifications API client
 */
export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  content: string | null;
  relatedId: string | null;
  relatedType: string | null;
  isRead: boolean;
  createdAt: string;
  from: { id: string | null; username: string | null; avatarUrl: string | null } | null;
}

export const notificationsApi = {
  async list(params?: { page?: number; limit?: number; unread?: boolean }): Promise<PaginatedResponse<NotificationItem> & { data: { unreadCount: number } }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.unread) searchParams.set('unread', 'true');
    return fetchApi(`/notifications?${searchParams}`) as any;
  },

  async markRead(id: string): Promise<ApiResponse<{ message: string }>> {
    return fetchApi(`/notifications/${id}/read`, { method: 'PATCH' });
  },

  async markAllRead(): Promise<ApiResponse<{ message: string }>> {
    return fetchApi('/notifications/read-all', { method: 'PATCH' });
  },

  async delete(id: string): Promise<ApiResponse<{ message: string }>> {
    return fetchApi(`/notifications/${id}`, { method: 'DELETE' });
  },
};

/**
 * Forum API client
 */
export const forumApi = {
  async listPosts(params?: { page?: number; limit?: number; sort?: string; status?: PostStatus }): Promise<PaginatedResponse<unknown>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    return fetchApi(`/forum/posts?${searchParams}`) as Promise<PaginatedResponse<unknown>>;
  },

  async getPendingPosts(params?: { page?: number; limit?: number }): Promise<PaginatedResponse<unknown>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    return fetchApi(`/forum/posts/pending?${searchParams}`) as Promise<PaginatedResponse<unknown>>;
  },

  async getPost(id: string): Promise<ApiResponse<unknown>> {
    return fetchApi(`/forum/posts/${id}`);
  },

  async reviewPost(id: string, input: ReviewPostInput): Promise<ApiResponse<unknown>> {
    return fetchApi(`/forum/posts/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
};

export { fetchApi };