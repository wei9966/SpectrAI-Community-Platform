/**
 * User role enumeration
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

/**
 * Public user info (safe to expose)
 */
export interface PublicUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
}

/**
 * Full user entity
 */
export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  githubId: string | null;
  bio: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User creation input
 */
export interface CreateUserInput {
  username: string;
  email: string;
  passwordHash?: string;
  githubId?: string;
  avatarUrl?: string;
}

/**
 * User update input
 */
export interface UpdateUserInput {
  username?: string;
  email?: string;
  avatarUrl?: string | null;
  bio?: string | null;
}