/**
 * Forum types for community discussion system
 */

/**
 * Post approval status
 */
export type PostStatus = 'pending' | 'approved' | 'rejected';

/**
 * Vote value enumeration
 */
export enum VoteValue {
  UP = 1,
  DOWN = -1,
  NONE = 0,
}

/**
 * Forum category entity
 */
export interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string | null;
  sortOrder: number;
  topicCount: number;
  postCount: number;
  lastActivityAt: Date | null;
  createdAt: Date;
}

/**
 * Forum post entity
 */
export interface ForumPost {
  id: string;
  categoryId: string;
  userId: string;
  title: string;
  content: string;
  viewCount: number;
  replyCount: number;
  isPinned: boolean;
  isLocked: boolean;
  isResolved: boolean;
  acceptedReplyId: string | null;
  status: PostStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  rejectReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Forum post detail with user info
 */
export interface ForumPostDetail extends ForumPost {
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  voteCount: number;
  userVote: VoteValue;
}

/**
 * Forum reply entity
 */
export interface ForumReply {
  id: string;
  postId: string;
  userId: string;
  parentId: string | null; // null for top-level replies
  content: string;
  voteCount: number;
  isAccepted: boolean;
  depth: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Reply with user info (flat structure)
 */
export interface ForumReplyFlat extends ForumReply {
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  userVote: VoteValue;
}

/**
 * Reply tree node for nested display
 */
export interface ReplyTree {
  reply: ForumReplyFlat;
  children: ReplyTree[];
}

/**
 * Input for creating a post
 */
export interface CreatePostInput {
  categoryId: string;
  title: string;
  content: string;
}

/**
 * Input for updating a post
 */
export interface UpdatePostInput {
  title?: string;
  content?: string;
  isPinned?: boolean;
  isLocked?: boolean;
  isResolved?: boolean;
  acceptedReplyId?: string | null;
}

/**
 * Input for creating a reply
 */
export interface CreateReplyInput {
  postId: string;
  parentId?: string | null;
  content: string;
}

/**
 * Input for reviewing (approve/reject) a post
 */
export interface ReviewPostInput {
  action: 'approve' | 'reject';
  reason?: string;
}

/**
 * Forum vote entity
 */
export interface ForumVote {
  id: string;
  postId: string | null; // null if voting on reply
  replyId: string | null; // null if voting on post
  userId: string;
  value: VoteValue;
  createdAt: Date;
  updatedAt: Date;
}
