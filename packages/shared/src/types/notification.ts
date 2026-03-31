/**
 * Notification types for user notification system
 */

/**
 * Notification type enumeration
 */
export enum NotificationType {
  COMMENT = 'comment',
  LIKE = 'like',
  FAVORITE = 'favorite',
  REPLY = 'reply',
  MENTION = 'mention',
  BEST_ANSWER = 'best_answer',
  SYSTEM = 'system',
}

/**
 * Related entity type enumeration
 */
export enum NotificationRelatedType {
  RESOURCE = 'resource',
  POST = 'post',
  REPLY = 'reply',
  PROJECT = 'project',
}

/**
 * Notification entity
 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedType: NotificationRelatedType | null;
  relatedId: string | null;
  isRead: boolean;
  createdAt: Date;
}

/**
 * Notification with actor info
 */
export interface NotificationWithActor extends Notification {
  actor: {
    id: string;
    username: string;
    avatarUrl: string | null;
  } | null;
}

/**
 * Notification list response
 */
export interface NotificationList {
  notifications: NotificationWithActor[];
  unreadCount: number;
}
