/**
 * Rating types for resource rating system
 */

/**
 * Resource rating entity
 */
export interface ResourceRating {
  id: string;
  resourceId: string;
  userId: string;
  rating: number; // 1-5 stars
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Rating statistics for a resource
 */
export interface RatingStats {
  resourceId: string;
  averageRating: number;
  ratingCount: number;
}

/**
 * Input for creating/updating a rating
 */
export interface CreateRatingInput {
  resourceId: string;
  rating: number; // 1-5
}

/**
 * Public rating with user info
 */
export interface PublicRating {
  id: string;
  resourceId: string;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  rating: number;
  createdAt: Date;
}
