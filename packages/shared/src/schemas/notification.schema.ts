import { z } from 'zod';

/**
 * Get notifications schema
 */
export const getNotificationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.boolean().default(false),
});

/**
 * Mark notification as read schema
 */
export const markNotificationReadSchema = z.object({
  notificationId: z.string().uuid(),
});

/**
 * Mark all notifications as read schema
 */
export const markAllNotificationsReadSchema = z.object({});

export type GetNotificationsInput = z.infer<typeof getNotificationsSchema>;
export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>;
