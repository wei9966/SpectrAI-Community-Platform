import { describe, it, expect } from 'vitest';
import {
  notificationSchema,
  notificationTypeSchema,
  createNotificationInputSchema,
  updateNotificationInputSchema,
  notificationWithSenderSchema,
  notificationCountsSchema,
  markAllReadResponseSchema,
} from '../schemas/notification';

// ============================================================================
// Test Factory Functions
// ============================================================================

/**
 * Creates a valid mock notification
 */
export function createMockNotification(overrides?: Partial<typeof validNotification>) {
  return { ...validNotification, ...overrides };
}

/**
 * Creates a valid mock notification input
 */
export function createMockNotificationInput(overrides?: Partial<typeof validNotificationInput>) {
  return { ...validNotificationInput, ...overrides };
}

/**
 * Creates a valid mock notification with sender
 */
export function createMockNotificationWithSender(overrides?: Partial<typeof validNotificationWithSender>) {
  return { ...validNotificationWithSender, ...overrides };
}

/**
 * Creates a valid mock notification counts
 */
export function createMockNotificationCounts(overrides?: Partial<typeof validNotificationCounts>) {
  return { ...validNotificationCounts, ...overrides };
}

/**
 * Creates a valid mock mark all read response
 */
export function createMockMarkAllReadResponse(overrides?: Partial<typeof validMarkAllReadResponse>) {
  return { ...validMarkAllReadResponse, ...overrides };
}

// ============================================================================
// Mock Data
// ============================================================================

const validNotification = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  userId: '770e8400-e29b-41d4-a716-446655440002',
  type: 'like' as const,
  title: 'Someone liked your resource',
  content: 'User123 liked your resource "Video Workflow"',
  relatedId: '660e8400-e29b-41d4-a716-446655440001',
  relatedType: 'resource',
  fromUserId: '880e8400-e29b-41d4-a716-446655440003',
  isRead: false,
  createdAt: '2026-03-31T10:00:00.000Z',
};

const validNotificationInput = {
  userId: '770e8400-e29b-41d4-a716-446655440002',
  type: 'comment' as const,
  title: 'New comment on your resource',
  content: 'User123 commented on your resource',
  relatedId: '660e8400-e29b-41d4-a716-446655440001',
  relatedType: 'resource',
  fromUserId: '880e8400-e29b-41d4-a716-446655440003',
};

const validNotificationWithSender = {
  ...validNotification,
  fromUser: {
    id: '880e8400-e29b-41d4-a716-446655440003',
    username: 'user123',
    avatarUrl: null,
  },
};

const validNotificationCounts = {
  total: 10,
  unread: 3,
};

const validMarkAllReadResponse = {
  success: true,
  markedCount: 5,
};

// ============================================================================
// Tests
// ============================================================================

describe('notificationTypeSchema', () => {
  it('should accept all valid notification types', () => {
    const validTypes = [
      'comment',
      'reply',
      'like',
      'favorite',
      'rating',
      'mention',
      'system',
      'post',
      'best_answer',
    ];
    validTypes.forEach((type) => {
      const result = notificationTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid notification types', () => {
    const result = notificationTypeSchema.safeParse('invalid');
    expect(result.success).toBe(false);
  });
});

describe('notificationSchema', () => {
  describe('valid input', () => {
    it('should validate a valid notification with all fields', () => {
      const result = notificationSchema.safeParse(validNotification);
      expect(result.success).toBe(true);
    });

    it('should accept notification with Date object timestamp', () => {
      const notificationWithDate = {
        ...validNotification,
        createdAt: new Date('2026-03-31T10:00:00.000Z'),
      };
      const result = notificationSchema.safeParse(notificationWithDate);
      expect(result.success).toBe(true);
    });

    it('should accept notification with null optional fields', () => {
      const notificationWithNulls = {
        ...validNotification,
        content: null,
        relatedId: null,
        relatedType: null,
        fromUserId: null,
      };
      const result = notificationSchema.safeParse(notificationWithNulls);
      expect(result.success).toBe(true);
    });

    it('should accept notification without optional content', () => {
      const { content, ...withoutContent } = validNotification;
      const result = notificationSchema.safeParse(withoutContent);
      expect(result.success).toBe(true);
    });

    it('should accept notification without optional relatedId', () => {
      const { relatedId, ...withoutRelatedId } = validNotification;
      const result = notificationSchema.safeParse(withoutRelatedId);
      expect(result.success).toBe(true);
    });

    it('should accept notification without optional relatedType', () => {
      const { relatedType, ...withoutRelatedType } = validNotification;
      const result = notificationSchema.safeParse(withoutRelatedType);
      expect(result.success).toBe(true);
    });

    it('should accept notification without optional fromUserId', () => {
      const { fromUserId, ...withoutFromUserId } = validNotification;
      const result = notificationSchema.safeParse(withoutFromUserId);
      expect(result.success).toBe(true);
    });

    it('should apply default isRead (false)', () => {
      const { isRead, ...withoutIsRead } = validNotification;
      const result = notificationSchema.safeParse(withoutIsRead);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isRead).toBe(false);
      }
    });

    it('should accept all valid notification types', () => {
      const types = ['comment', 'reply', 'like', 'favorite', 'rating', 'mention', 'system', 'post', 'best_answer'] as const;
      types.forEach((type) => {
        const notification = { ...validNotification, type };
        const result = notificationSchema.safeParse(notification);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('invalid input - required fields', () => {
    it('should reject without id', () => {
      const { id, ...withoutId } = validNotification;
      const result = notificationSchema.safeParse(withoutId);
      expect(result.success).toBe(false);
    });

    it('should reject without userId', () => {
      const { userId, ...withoutUserId } = validNotification;
      const result = notificationSchema.safeParse(withoutUserId);
      expect(result.success).toBe(false);
    });

    it('should reject without type', () => {
      const { type, ...withoutType } = validNotification;
      const result = notificationSchema.safeParse(withoutType);
      expect(result.success).toBe(false);
    });

    it('should reject without title', () => {
      const { title, ...withoutTitle } = validNotification;
      const result = notificationSchema.safeParse(withoutTitle);
      expect(result.success).toBe(false);
    });

    it('should reject without createdAt', () => {
      const { createdAt, ...withoutCreatedAt } = validNotification;
      const result = notificationSchema.safeParse(withoutCreatedAt);
      expect(result.success).toBe(false);
    });
  });

  describe('invalid input - field validation', () => {
    it('should reject invalid UUID format for id', () => {
      const invalid = createMockNotification({ id: 'invalid-uuid' });
      const result = notificationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format for userId', () => {
      const invalid = createMockNotification({ userId: 'invalid-uuid' });
      const result = notificationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid notification type', () => {
      const invalid = createMockNotification({ type: 'invalid' as const });
      const result = notificationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject title exceeding 200 characters', () => {
      const invalid = createMockNotification({ title: 'a'.repeat(201) });
      const result = notificationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject empty title', () => {
      const invalid = createMockNotification({ title: '' });
      const result = notificationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format for relatedId', () => {
      const invalid = createMockNotification({ relatedId: 'invalid-uuid' });
      const result = notificationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format for fromUserId', () => {
      const invalid = createMockNotification({ fromUserId: 'invalid-uuid' });
      const result = notificationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean isRead', () => {
      const invalid = createMockNotification({ isRead: 'false' as unknown as boolean });
      const result = notificationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('boundary values', () => {
    it('should accept title with exactly 200 characters', () => {
      const notification = createMockNotification({ title: 'a'.repeat(200) });
      const result = notificationSchema.safeParse(notification);
      expect(result.success).toBe(true);
    });
  });

  describe('type inference', () => {
    it('should infer correct types from valid notification', () => {
      const result = notificationSchema.safeParse(validNotification);
      expect(result.success).toBe(true);
      if (result.success) {
        const parsed = result.data;
        expect(typeof parsed.id).toBe('string');
        expect(typeof parsed.userId).toBe('string');
        expect(typeof parsed.type).toBe('string');
        expect(typeof parsed.title).toBe('string');
        expect(typeof parsed.isRead).toBe('boolean');
      }
    });
  });
});

describe('createNotificationInputSchema', () => {
  describe('valid input', () => {
    it('should validate a valid notification input', () => {
      const result = createNotificationInputSchema.safeParse(validNotificationInput);
      expect(result.success).toBe(true);
    });

    it('should accept without optional content', () => {
      const { content, ...withoutContent } = validNotificationInput;
      const result = createNotificationInputSchema.safeParse(withoutContent);
      expect(result.success).toBe(true);
    });

    it('should accept without optional relatedId', () => {
      const { relatedId, ...withoutRelatedId } = validNotificationInput;
      const result = createNotificationInputSchema.safeParse(withoutRelatedId);
      expect(result.success).toBe(true);
    });

    it('should accept without optional relatedType', () => {
      const { relatedType, ...withoutRelatedType } = validNotificationInput;
      const result = createNotificationInputSchema.safeParse(withoutRelatedType);
      expect(result.success).toBe(true);
    });

    it('should accept without optional fromUserId', () => {
      const { fromUserId, ...withoutFromUserId } = validNotificationInput;
      const result = createNotificationInputSchema.safeParse(withoutFromUserId);
      expect(result.success).toBe(true);
    });

    it('should accept with null optional fields', () => {
      const input = {
        ...validNotificationInput,
        content: null,
        relatedId: null,
        relatedType: null,
        fromUserId: null,
      };
      const result = createNotificationInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid input - required fields', () => {
    it('should reject without userId', () => {
      const { userId, ...withoutUserId } = validNotificationInput;
      const result = createNotificationInputSchema.safeParse(withoutUserId);
      expect(result.success).toBe(false);
    });

    it('should reject without type', () => {
      const { type, ...withoutType } = validNotificationInput;
      const result = createNotificationInputSchema.safeParse(withoutType);
      expect(result.success).toBe(false);
    });

    it('should reject without title', () => {
      const { title, ...withoutTitle } = validNotificationInput;
      const result = createNotificationInputSchema.safeParse(withoutTitle);
      expect(result.success).toBe(false);
    });
  });

  describe('invalid input - field validation', () => {
    it('should reject invalid UUID format for userId', () => {
      const invalid = createMockNotificationInput({ userId: 'invalid-uuid' });
      const result = createNotificationInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid notification type', () => {
      const invalid = createMockNotificationInput({ type: 'invalid' as const });
      const result = createNotificationInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject empty title', () => {
      const invalid = createMockNotificationInput({ title: '' });
      const result = createNotificationInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject title exceeding 200 characters', () => {
      const invalid = createMockNotificationInput({ title: 'a'.repeat(201) });
      const result = createNotificationInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format for relatedId', () => {
      const invalid = createMockNotificationInput({ relatedId: 'invalid-uuid' });
      const result = createNotificationInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format for fromUserId', () => {
      const invalid = createMockNotificationInput({ fromUserId: 'invalid-uuid' });
      const result = createNotificationInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});

describe('updateNotificationInputSchema', () => {
  describe('valid input', () => {
    it('should validate with isRead true', () => {
      const result = updateNotificationInputSchema.safeParse({ isRead: true });
      expect(result.success).toBe(true);
    });

    it('should validate with isRead false', () => {
      const result = updateNotificationInputSchema.safeParse({ isRead: false });
      expect(result.success).toBe(true);
    });

    it('should validate with empty object', () => {
      const result = updateNotificationInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('invalid input', () => {
    it('should reject non-boolean isRead', () => {
      const result = updateNotificationInputSchema.safeParse({ isRead: 'true' });
      expect(result.success).toBe(false);
    });

    // Note: Zod by default allows unknown fields, so we don't test for rejection
    // If strict validation is needed, the schema should use .strict()
  });
});

describe('notificationWithSenderSchema', () => {
  describe('valid input', () => {
    it('should validate a notification with sender', () => {
      const result = notificationWithSenderSchema.safeParse(validNotificationWithSender);
      expect(result.success).toBe(true);
    });

    it('should accept with null fromUser', () => {
      const notification = { ...validNotificationWithSender, fromUser: null };
      const result = notificationWithSenderSchema.safeParse(notification);
      expect(result.success).toBe(true);
    });

    it('should accept with undefined fromUser', () => {
      const { fromUser, ...withoutFromUser } = validNotificationWithSender;
      const result = notificationWithSenderSchema.safeParse(withoutFromUser);
      expect(result.success).toBe(true);
    });

    it('should accept sender with null avatarUrl', () => {
      const notification = {
        ...validNotificationWithSender,
        fromUser: { ...validNotificationWithSender.fromUser!, avatarUrl: null },
      };
      const result = notificationWithSenderSchema.safeParse(notification);
      expect(result.success).toBe(true);
    });

    it('should accept sender without optional avatarUrl', () => {
      const { avatarUrl, ...withoutAvatarUrl } = validNotificationWithSender.fromUser!;
      const notification = {
        ...validNotificationWithSender,
        fromUser: withoutAvatarUrl,
      };
      const result = notificationWithSenderSchema.safeParse(notification);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid input', () => {
    it('should reject sender with invalid UUID', () => {
      const invalid = createMockNotificationWithSender({
        fromUser: { ...validNotificationWithSender.fromUser!, id: 'invalid-uuid' },
      });
      const result = notificationWithSenderSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject sender without username', () => {
      const { username, ...withoutUsername } = validNotificationWithSender.fromUser!;
      const invalid = createMockNotificationWithSender({ fromUser: withoutUsername });
      const result = notificationWithSenderSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});

describe('notificationCountsSchema', () => {
  describe('valid input', () => {
    it('should validate valid notification counts', () => {
      const result = notificationCountsSchema.safeParse(validNotificationCounts);
      expect(result.success).toBe(true);
    });

    it('should accept zero total', () => {
      const counts = createMockNotificationCounts({ total: 0 });
      const result = notificationCountsSchema.safeParse(counts);
      expect(result.success).toBe(true);
    });

    it('should accept zero unread', () => {
      const counts = createMockNotificationCounts({ unread: 0 });
      const result = notificationCountsSchema.safeParse(counts);
      expect(result.success).toBe(true);
    });

    it('should accept equal total and unread', () => {
      const counts = createMockNotificationCounts({ total: 5, unread: 5 });
      const result = notificationCountsSchema.safeParse(counts);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid input', () => {
    it('should reject negative total', () => {
      const counts = createMockNotificationCounts({ total: -1 });
      const result = notificationCountsSchema.safeParse(counts);
      expect(result.success).toBe(false);
    });

    it('should reject negative unread', () => {
      const counts = createMockNotificationCounts({ unread: -1 });
      const result = notificationCountsSchema.safeParse(counts);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer total', () => {
      const counts = createMockNotificationCounts({ total: 3.5 });
      const result = notificationCountsSchema.safeParse(counts);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer unread', () => {
      const counts = createMockNotificationCounts({ unread: 2.5 });
      const result = notificationCountsSchema.safeParse(counts);
      expect(result.success).toBe(false);
    });

    it('should reject without total', () => {
      const { total, ...withoutTotal } = validNotificationCounts;
      const result = notificationCountsSchema.safeParse(withoutTotal);
      expect(result.success).toBe(false);
    });

    it('should reject without unread', () => {
      const { unread, ...withoutUnread } = validNotificationCounts;
      const result = notificationCountsSchema.safeParse(withoutUnread);
      expect(result.success).toBe(false);
    });
  });
});

describe('markAllReadResponseSchema', () => {
  describe('valid input', () => {
    it('should validate a valid mark all read response', () => {
      const result = markAllReadResponseSchema.safeParse(validMarkAllReadResponse);
      expect(result.success).toBe(true);
    });

    it('should accept zero markedCount', () => {
      const response = createMockMarkAllReadResponse({ markedCount: 0 });
      const result = markAllReadResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should accept false success', () => {
      const response = createMockMarkAllReadResponse({ success: false });
      const result = markAllReadResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid input', () => {
    it('should reject without success', () => {
      const { success, ...withoutSuccess } = validMarkAllReadResponse;
      const result = markAllReadResponseSchema.safeParse(withoutSuccess);
      expect(result.success).toBe(false);
    });

    it('should reject without markedCount', () => {
      const { markedCount, ...withoutMarkedCount } = validMarkAllReadResponse;
      const result = markAllReadResponseSchema.safeParse(withoutMarkedCount);
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean success', () => {
      const response = createMockMarkAllReadResponse({ success: 'true' as unknown as boolean });
      const result = markAllReadResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer markedCount', () => {
      const response = createMockMarkAllReadResponse({ markedCount: 3.5 });
      const result = markAllReadResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('should reject negative markedCount', () => {
      const response = createMockMarkAllReadResponse({ markedCount: -1 });
      const result = markAllReadResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });
  });

  describe('type inference', () => {
    it('should infer correct types from valid response', () => {
      const result = markAllReadResponseSchema.safeParse(validMarkAllReadResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        const parsed = result.data;
        expect(typeof parsed.success).toBe('boolean');
        expect(typeof parsed.markedCount).toBe('number');
      }
    });
  });
});

describe('Notification schema integration', () => {
  it('should handle complete notification flow', () => {
    // Create notification
    const createResult = createNotificationInputSchema.safeParse({
      userId: '770e8400-e29b-41d4-a716-446655440002',
      type: 'like',
      title: 'Test Notification',
    });
    expect(createResult.success).toBe(true);

    // Full notification
    const fullResult = notificationSchema.safeParse(validNotification);
    expect(fullResult.success).toBe(true);

    // Update notification (mark as read)
    const updateResult = updateNotificationInputSchema.safeParse({ isRead: true });
    expect(updateResult.success).toBe(true);

    // Notification with sender
    const withSenderResult = notificationWithSenderSchema.safeParse(validNotificationWithSender);
    expect(withSenderResult.success).toBe(true);

    // Counts
    const countsResult = notificationCountsSchema.safeParse(validNotificationCounts);
    expect(countsResult.success).toBe(true);

    // Mark all read response
    const markAllResult = markAllReadResponseSchema.safeParse(validMarkAllReadResponse);
    expect(markAllResult.success).toBe(true);
  });

  it('should handle all notification types', () => {
    const types = ['comment', 'reply', 'like', 'favorite', 'rating', 'mention', 'system', 'post', 'best_answer'] as const;
    types.forEach((type) => {
      const result = createNotificationInputSchema.safeParse({
        userId: '770e8400-e29b-41d4-a716-446655440002',
        type,
        title: 'Test',
      });
      expect(result.success).toBe(true);
    });
  });
});
