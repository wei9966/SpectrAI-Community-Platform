import { describe, it, expect, beforeEach } from 'vitest';
import {
  resourceRatingSchema,
  createRatingInputSchema,
  updateRatingInputSchema,
  resourceRatingStatsSchema,
} from '../schemas/rating';

// ============================================================================
// Test Factory Functions
// ============================================================================

/**
 * Creates a valid mock rating object
 */
export function createMockRating(overrides?: Partial<typeof validRating>) {
  return { ...validRating, ...overrides };
}

/**
 * Creates a valid mock rating input (for creation)
 */
export function createMockRatingInput(overrides?: Partial<typeof validRatingInput>) {
  return { ...validRatingInput, ...overrides };
}

/**
 * Creates a valid mock rating stats object
 */
export function createMockRatingStats(overrides?: Partial<typeof validRatingStats>) {
  return { ...validRatingStats, ...overrides };
}

// ============================================================================
// Mock Data
// ============================================================================

const validRating = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  resourceId: '660e8400-e29b-41d4-a716-446655440001',
  userId: '770e8400-e29b-41d4-a716-446655440002',
  rating: 5,
  createdAt: '2026-03-31T10:00:00.000Z',
  updatedAt: '2026-03-31T10:00:00.000Z',
};

const validRatingInput = {
  resourceId: '660e8400-e29b-41d4-a716-446655440001',
  rating: 4,
};

const validRatingStats = {
  averageRating: 4.5,
  ratingCount: 10,
  distribution: {
    1: 0,
    2: 1,
    3: 2,
    4: 3,
    5: 4,
  },
};

// ============================================================================
// Tests
// ============================================================================

describe('resourceRatingSchema', () => {
  describe('valid input', () => {
    it('should validate a valid rating with all required fields', () => {
      const result = resourceRatingSchema.safeParse(validRating);
      expect(result.success).toBe(true);
    });

    it('should accept rating with Date object timestamps', () => {
      const ratingWithDateObjects = {
        ...validRating,
        createdAt: new Date('2026-03-31T10:00:00.000Z'),
        updatedAt: new Date('2026-03-31T10:00:00.000Z'),
      };
      const result = resourceRatingSchema.safeParse(ratingWithDateObjects);
      expect(result.success).toBe(true);
    });

    it('should validate with minimum rating (1)', () => {
      const minRating = createMockRating({ rating: 1 });
      const result = resourceRatingSchema.safeParse(minRating);
      expect(result.success).toBe(true);
    });

    it('should validate with maximum rating (5)', () => {
      const maxRating = createMockRating({ rating: 5 });
      const result = resourceRatingSchema.safeParse(maxRating);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid input - required fields', () => {
    it('should reject without id', () => {
      const { id, ...withoutId } = validRating;
      const result = resourceRatingSchema.safeParse(withoutId);
      expect(result.success).toBe(false);
    });

    it('should reject without resourceId', () => {
      const { resourceId, ...withoutResourceId } = validRating;
      const result = resourceRatingSchema.safeParse(withoutResourceId);
      expect(result.success).toBe(false);
    });

    it('should reject without userId', () => {
      const { userId, ...withoutUserId } = validRating;
      const result = resourceRatingSchema.safeParse(withoutUserId);
      expect(result.success).toBe(false);
    });

    it('should reject without rating', () => {
      const { rating, ...withoutRating } = validRating;
      const result = resourceRatingSchema.safeParse(withoutRating);
      expect(result.success).toBe(false);
    });

    it('should reject without createdAt', () => {
      const { createdAt, ...withoutCreatedAt } = validRating;
      const result = resourceRatingSchema.safeParse(withoutCreatedAt);
      expect(result.success).toBe(false);
    });

    it('should reject without updatedAt', () => {
      const { updatedAt, ...withoutUpdatedAt } = validRating;
      const result = resourceRatingSchema.safeParse(withoutUpdatedAt);
      expect(result.success).toBe(false);
    });
  });

  describe('invalid input - field validation', () => {
    it('should reject invalid UUID format for id', () => {
      const invalidId = createMockRating({ id: 'invalid-uuid' });
      const result = resourceRatingSchema.safeParse(invalidId);
      expect(result.success).toBe(false);
    });

    it('should reject rating below minimum (0)', () => {
      const invalidRating = createMockRating({ rating: 0 });
      const result = resourceRatingSchema.safeParse(invalidRating);
      expect(result.success).toBe(false);
    });

    it('should reject rating above maximum (6)', () => {
      const invalidRating = createMockRating({ rating: 6 });
      const result = resourceRatingSchema.safeParse(invalidRating);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer rating (3.5)', () => {
      const invalidRating = createMockRating({ rating: 3.5 });
      const result = resourceRatingSchema.safeParse(invalidRating);
      expect(result.success).toBe(false);
    });

    it('should reject string rating', () => {
      const invalidRating = createMockRating({ rating: '5' as unknown as number });
      const result = resourceRatingSchema.safeParse(invalidRating);
      expect(result.success).toBe(false);
    });

    it('should reject negative rating (-1)', () => {
      const invalidRating = createMockRating({ rating: -1 });
      const result = resourceRatingSchema.safeParse(invalidRating);
      expect(result.success).toBe(false);
    });
  });

  describe('type inference', () => {
    it('should infer correct types from valid rating', () => {
      const result = resourceRatingSchema.safeParse(validRating);
      expect(result.success).toBe(true);
      if (result.success) {
        const parsed = result.data;
        expect(typeof parsed.id).toBe('string');
        expect(typeof parsed.resourceId).toBe('string');
        expect(typeof parsed.userId).toBe('string');
        expect(typeof parsed.rating).toBe('number');
        expect(typeof parsed.createdAt).toBe('string');
        expect(typeof parsed.updatedAt).toBe('string');
      }
    });
  });
});

describe('createRatingInputSchema', () => {
  describe('valid input', () => {
    it('should validate a valid rating input', () => {
      const result = createRatingInputSchema.safeParse(validRatingInput);
      expect(result.success).toBe(true);
    });

    it('should accept minimum rating (1)', () => {
      const input = createMockRatingInput({ rating: 1 });
      const result = createRatingInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept maximum rating (5)', () => {
      const input = createMockRatingInput({ rating: 5 });
      const result = createRatingInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid input - required fields', () => {
    it('should reject without resourceId', () => {
      const { resourceId, ...withoutResourceId } = validRatingInput;
      const result = createRatingInputSchema.safeParse(withoutResourceId);
      expect(result.success).toBe(false);
    });

    it('should reject without rating', () => {
      const { rating, ...withoutRating } = validRatingInput;
      const result = createRatingInputSchema.safeParse(withoutRating);
      expect(result.success).toBe(false);
    });
  });

  describe('invalid input - field validation', () => {
    it('should reject invalid UUID format for resourceId', () => {
      const invalidInput = createMockRatingInput({ resourceId: 'invalid-uuid' });
      const result = createRatingInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject rating below minimum (0)', () => {
      const invalidInput = createMockRatingInput({ rating: 0 });
      const result = createRatingInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject rating above maximum (6)', () => {
      const invalidInput = createMockRatingInput({ rating: 6 });
      const result = createRatingInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer rating', () => {
      const invalidInput = createMockRatingInput({ rating: 3.5 });
      const result = createRatingInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('boundary values', () => {
    it('should accept all valid rating values (1-5)', () => {
      [1, 2, 3, 4, 5].forEach((rating) => {
        const input = createMockRatingInput({ rating });
        const result = createRatingInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });
  });
});

describe('updateRatingInputSchema', () => {
  describe('valid input', () => {
    it('should validate with valid rating update', () => {
      const result = updateRatingInputSchema.safeParse({ rating: 4 });
      expect(result.success).toBe(true);
    });

    it('should validate with empty object (all optional)', () => {
      const result = updateRatingInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept minimum rating (1)', () => {
      const result = updateRatingInputSchema.safeParse({ rating: 1 });
      expect(result.success).toBe(true);
    });

    it('should accept maximum rating (5)', () => {
      const result = updateRatingInputSchema.safeParse({ rating: 5 });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid input', () => {
    it('should reject rating below minimum (0)', () => {
      const result = updateRatingInputSchema.safeParse({ rating: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject rating above maximum (6)', () => {
      const result = updateRatingInputSchema.safeParse({ rating: 6 });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer rating', () => {
      const result = updateRatingInputSchema.safeParse({ rating: 3.5 });
      expect(result.success).toBe(false);
    });
  });
});

describe('resourceRatingStatsSchema', () => {
  describe('valid input', () => {
    it('should validate a valid rating stats object', () => {
      const result = resourceRatingStatsSchema.safeParse(validRatingStats);
      expect(result.success).toBe(true);
    });

    it('should accept empty distribution', () => {
      const stats = createMockRatingStats({ distribution: {} });
      const result = resourceRatingStatsSchema.safeParse(stats);
      expect(result.success).toBe(true);
    });

    it('should apply default values for missing fields', () => {
      const result = resourceRatingStatsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.averageRating).toBe(0);
        expect(result.data.ratingCount).toBe(0);
        expect(result.data.distribution).toEqual({});
      }
    });

    it('should accept zero average rating', () => {
      const stats = createMockRatingStats({ averageRating: 0 });
      const result = resourceRatingStatsSchema.safeParse(stats);
      expect(result.success).toBe(true);
    });

    it('should accept zero rating count', () => {
      const stats = createMockRatingStats({ ratingCount: 0 });
      const result = resourceRatingStatsSchema.safeParse(stats);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid input', () => {
    it('should reject negative average rating', () => {
      const stats = createMockRatingStats({ averageRating: -1 });
      const result = resourceRatingStatsSchema.safeParse(stats);
      expect(result.success).toBe(false);
    });

    it('should reject negative rating count', () => {
      const stats = createMockRatingStats({ ratingCount: -1 });
      const result = resourceRatingStatsSchema.safeParse(stats);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer rating count', () => {
      const stats = createMockRatingStats({ ratingCount: 3.5 });
      const result = resourceRatingStatsSchema.safeParse(stats);
      expect(result.success).toBe(false);
    });
  });
});

describe('Rating schema integration', () => {
  it('should parse and transform valid rating data through all schemas', () => {
    const input = { resourceId: '660e8400-e29b-41d4-a716-446655440001', rating: 5 };
    const inputResult = createRatingInputSchema.safeParse(input);
    expect(inputResult.success).toBe(true);

    const fullRating = {
      ...input,
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '770e8400-e29b-41d4-a716-446655440002',
      createdAt: '2026-03-31T10:00:00.000Z',
      updatedAt: '2026-03-31T10:00:00.000Z',
    };
    const fullResult = resourceRatingSchema.safeParse(fullRating);
    expect(fullResult.success).toBe(true);
  });

  it('should handle update operation with partial data', () => {
    const updateData = { rating: 3 };
    const result = updateRatingInputSchema.safeParse(updateData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rating).toBe(3);
    }
  });
});
