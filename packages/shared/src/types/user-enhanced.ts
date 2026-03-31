/**
 * Enhanced user types for user profile pages
 */

/**
 * User statistics
 */
export interface UserStats {
  totalDownloads: number;
  totalLikes: number;
  totalRating: number; // sum of ratings received
  ratingCount: number;
  resourceCount: number;
  projectCount: number;
  forumPostCount: number;
  forumReplyCount: number;
  joinDays: number;
}

/**
 * User activity types
 */
export type UserActivityType = 'resource_created' | 'resource_updated' | 'resource_published' |
  'comment_added' | 'reply_added' | 'project_created' | 'project_updated' |
  'forum_post_created' | 'forum_reply_created' | 'favorite_added' | 'rating_given';

/**
 * User activity item
 */
export interface UserActivity {
  id: string;
  type: UserActivityType;
  description: string;
  relatedId: string | null;
  relatedType: string | null;
  createdAt: Date;
}

/**
 * Tab configuration for user profile
 */
export type UserProfileTab = 'resources' | 'likes' | 'comments' | 'favorites' | 'projects' | 'activity';

/**
 * User resource item (for profile tabs)
 */
export interface UserResourceItem {
  id: string;
  name: string;
  description: string;
  type: string;
  likes: number;
  downloads: number;
  ratingCount: number;
  averageRating: number | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User comment item
 */
export interface UserCommentItem {
  id: string;
  resourceId: string;
  resourceName: string;
  content: string;
  createdAt: Date;
}

/**
 * User favorite item
 */
export interface UserFavoriteItem {
  id: string;
  resourceId: string;
  resourceName: string;
  resourceType: string;
  resourceAuthor: {
    id: string;
    username: string;
  };
  createdAt: Date;
}
