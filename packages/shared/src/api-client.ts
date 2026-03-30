import type { ApiResponse, PaginatedResponse, LoginRequest, RegisterRequest, AuthResponse, SearchParams, PaginationInfo } from '../types/api';
import type { Resource, PublicResource, CreateResourceInput, UpdateResourceInput, ResourceType } from '../types/resource';
import type { User, PublicUser, UpdateUserInput } from '../types/user';

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

  // Note: download endpoint not available in backend, client should handle download separately
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
};

export { fetchApi };