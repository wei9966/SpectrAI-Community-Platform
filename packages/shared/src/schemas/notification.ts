import { z } from 'zod';

/**
 * Notification type enum schema
 */
export const notificationTypeSchema = z.enum([
  'comment',
  'reply',
  'like',
  'favorite',
  'rating',
  'mention',
  'system',
  'post',
  'best_answer',
]);

/**
 * Notification schema
 * Matches notifications table structure
 */
export const notificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: notificationTypeSchema,
  title: z.string().min(1).max(200),
  content: z.string().nullable().optional(),
  relatedId: z.string().uuid().nullable().optional(),
  relatedType: z.string().nullable().optional(),
  fromUserId: z.string().uuid().nullable().optional(),
  isRead: z.boolean().default(false),
  createdAt: z.string().or(z.date()),
});

/**
 * Create notification input schema
 */
export const createNotificationInputSchema = z.object({
  userId: z.string().uuid(),
  type: notificationTypeSchema,
  title: z.string().min(1).max(200),
  content: z.string().nullable().optional(),
  relatedId: z.string().uuid().nullable().optional(),
  relatedType: z.string().nullable().optional(),
  fromUserId: z.string().uuid().nullable().optional(),
});

/**
 * Update notification input schema
 */
export const updateNotificationInputSchema = z.object({
  isRead: z.boolean().optional(),
});

/**
 * Notification with sender info
 */
export const notificationWithSenderSchema = notificationSchema.extend({
  fromUser: z.object({
    id: z.string().uuid(),
    username: z.string(),
    avatarUrl: z.string().nullable().optional(),
  }).nullable().optional(),
});

/**
 * Notification counts schema
 */
export const notificationCountsSchema = z.object({
  total: z.number().int().nonnegative(),
  unread: z.number().int().nonnegative(),
});

/**
 * Mark all notifications as read response schema
 */
export const markAllReadResponseSchema = z.object({
  success: z.boolean(),
  markedCount: z.number().int().nonnegative(),
});

// Type exports
export type Notification = z.infer<typeof notificationSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationInputSchema>;
export type UpdateNotificationInput = z.infer<typeof updateNotificationInputSchema>;
export type NotificationWithSender = z.infer<typeof notificationWithSenderSchema>;
export type NotificationCounts = z.infer<typeof notificationCountsSchema>;
export type MarkAllReadResponse = z.infer<typeof markAllReadResponseSchema>;
export type NotificationType = z.infer<typeof notificationTypeSchema>;
