/**
 * Favorite types for resource bookmarking system
 */

/**
 * Resource favorite entity
 */
export interface ResourceFavorite {
  id: string;
  resourceId: string;
  userId: string;
  createdAt: Date;
}

/**
 * Public favorite with resource and user info
 */
export interface PublicFavorite {
  id: string;
  resourceId: string;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  resource: {
    id: string;
    name: string;
    description: string;
    type: string;
    author: {
      id: string;
      username: string;
      avatarUrl: string | null;
    };
  };
  createdAt: Date;
}

/**
 * Response for toggle favorite operation
 */
export interface ToggleFavoriteResponse {
  isFavorited: boolean;
  favoriteCount: number;
}
