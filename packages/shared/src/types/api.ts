/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

import { UserRole } from './user';
export { UserRole };

/**
 * Pagination params for list queries
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * Search params with filters
 */
export interface SearchParams extends PaginationParams {
  query?: string;
  type?: string;
  tags?: string[];
  authorId?: string;
  sortBy?: 'createdAt' | 'downloads' | 'likes' | 'name';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Pagination info
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Paginated response (backend format)
 * Response: { success: true, data: { items: T[], pagination: { page, limit, total, totalPages } } }
 */
export interface PaginatedResponse<T> {
  success: true;
  data: {
    items: T[];
    pagination: PaginationInfo;
  };
  error?: never;
}

/**
 * Auth response types
 */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  inviteCode?: string;
}

export interface GithubAuthRequest {
  code: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatarUrl: string | null;
    role: UserRole;
  };
}

/**
 * Password change request
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * API error response
 */
export interface ApiError {
  success: false;
  error: string;
  code?: string;
}