/**
 * Notification utility — fire-and-forget notification creation.
 * Skips self-notifications automatically.
 */
import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

interface CreateNotificationParams {
  type: string;
  fromUserId: string;
  toUserId: string;
  title: string;
  content?: string;
  relatedId?: string;
  relatedType?: string;
}

/**
 * Insert a notification row. Silently skips when sender === receiver.
 * Errors are caught and logged to avoid breaking the main request flow.
 */
export async function createNotification(params: CreateNotificationParams) {
  const { type, fromUserId, toUserId, title, content, relatedId, relatedType } = params;

  // Never notify yourself
  if (fromUserId === toUserId) return;

  try {
    await db.insert(notifications).values({
      userId: toUserId,
      fromUserId,
      type,
      title,
      content,
      relatedId,
      relatedType,
    });
  } catch (err) {
    console.error("[notify] Failed to create notification:", err);
  }
}
