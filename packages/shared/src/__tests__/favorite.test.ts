import { describe, it, expect } from 'vitest';
import {
  resourceFavoriteSchema,
  createFavoriteInputSchema,
  toggleFavoriteResponseSchema,
} from '../schemas/favorite';

// ============================================================================
// Test Factory Functions
// ============================================================================

/**
 * Creates a valid mock favorite object
 */
export function createMockFavorite(overrides?: Partial<typeof validFavorite>) {
  return { ...validFavorite, ...overrides };
}

/**
 * Creates a valid mock favorite input (for creation)
 */
export function createMockFavoriteInput(overrides?: Partial<typeof validFavoriteInput>) {
  return { ...validFavoriteInput, ...overrides };
}

/**
 * Creates a valid mock toggle favorite response
 */
export function createMockToggleFavoriteResponse(overrides?: Partial<typeof validToggleResponse>) {
  return { ...validToggleResponse, ...overrides };
}

// ============================================================================
// Mock Data
// ============================================================================

const validFavorite = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  resourceId: '660e8400-e29b-41d4-a716-446655440001',
  userId: '770e8400-e29b-41d4-a716-446655440002',
  createdAt: '2026-03-31T10:00:00.000Z',
};

const validFavoriteInput = {
  resourceId: '660e8400-e29b-41d4-a716-446655440001',
};

const validToggleResponse = {
  success: true,
  isFavorite: true,
  favoriteCount: 10,
};

// ============================================================================
// Tests
// ============================================================================

describe('resourceFavoriteSchema', () => {
  describe('valid input', () => {
    it('should validate a valid favorite with all required fields', () => {
      const result = resourceFavoriteSchema.safeParse(validFavorite);
      expect(result.success).toBe(true);
    });

    it('should accept favorite with Date object timestamp', () => {
      const favoriteWithDateObject = {
        ...validFavorite,
        createdAt: new Date('2026-03-31T10:00:00.000Z'),
      };
      const result = resourceFavoriteSchema.safeParse(favoriteWithDateObject);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid input - required fields', () => {
    it('should reject without id', () => {
      const { id, ...withoutId } = validFavorite;
      const result = resourceFavoriteSchema.safeParse(withoutId);
      expect(result.success).toBe(false);
    });

    it('should reject without resourceId', () => {
      const { resourceId, ...withoutResourceId } = validFavorite;
      const result = resourceFavoriteSchema.safeParse(withoutResourceId);
      expect(result.success).toBe(false);
    });

    it('should reject without userId', () => {
      const { userId, ...withoutUserId } = validFavorite;
      const result = resourceFavoriteSchema.safeParse(withoutUserId);
      expect(result.success).toBe(false);
    });

    it('should reject without createdAt', () => {
      const { createdAt, ...withoutCreatedAt } = validFavorite;
      const result = resourceFavoriteSchema.safeParse(withoutCreatedAt);
      expect(result.success).toBe(false);
    });
  });

  describe('invalid input - field validation', () => {
    it('should reject invalid UUID format for id', () => {
      const invalidFavorite = createMockFavorite({ id: 'invalid-uuid' });
      const result = resourceFavoriteSchema.safeParse(invalidFavorite);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format for resourceId', () => {
      const invalidFavorite = createMockFavorite({ resourceId: 'invalid-uuid' });
      const result = resourceFavoriteSchema.safeParse(invalidFavorite);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format for userId', () => {
      const invalidFavorite = createMockFavorite({ userId: 'invalid-uuid' });
      const result = resourceFavoriteSchema.safeParse(invalidFavorite);
      expect(result.success).toBe(false);
    });

    it('should reject non-string createdAt', () => {
      const invalidFavorite = createMockFavorite({ createdAt: 12345 });
      const result = resourceFavoriteSchema.safeParse(invalidFavorite);
      expect(result.success).toBe(false);
    });
  });

  describe('type inference', () => {
    it('should infer correct types from valid favorite', () => {
      const result = resourceFavoriteSchema.safeParse(validFavorite);
      expect(result.success).toBe(true);
      if (result.success) {
        const parsed = result.data;
        expect(typeof parsed.id).toBe('string');
        expect(typeof parsed.resourceId).toBe('string');
        expect(typeof parsed.userId).toBe('string');
        expect(typeof parsed.createdAt).toBe('string');
      }
    });
  });
});

describe('createFavoriteInputSchema', () => {
  describe('valid input', () => {
    it('should validate a valid favorite input', () => {
      const result = createFavoriteInputSchema.safeParse(validFavoriteInput);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid input - required fields', () => {
    it('should reject without resourceId', () => {
      const { resourceId, ...withoutResourceId } = validFavoriteInput;
      const result = createFavoriteInputSchema.safeParse(withoutResourceId);
      expect(result.success).toBe(false);
    });
  });

  describe('invalid input - field validation', () => {
    it('should reject invalid UUID format for resourceId', () => {
      const invalidInput = createMockFavoriteInput({ resourceId: 'invalid-uuid' });
      const result = createFavoriteInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('extra fields', () => {
    it('should strip unknown fields', () => {
      const inputWithExtra = {
        ...validFavoriteInput,
        extraField: 'should be stripped',
      };
      const result = createFavoriteInputSchema.safeParse(inputWithExtra);
      expect(result.success).toBe(true);
      if (result.success) {
        expect('extraField' in result.data).toBe(false);
      }
    });
  });
});

describe('toggleFavoriteResponseSchema', () => {
  describe('valid input', () => {
    it('should validate a valid toggle response', () => {
      const result = toggleFavoriteResponseSchema.safeParse(validToggleResponse);
      expect(result.success).toBe(true);
    });

    it('should accept isFavorite as false', () => {
      const response = createMockToggleFavoriteResponse({ isFavorite: false });
      const result = toggleFavoriteResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should accept zero favoriteCount', () => {
      const response = createMockToggleFavoriteResponse({ favoriteCount: 0 });
      const result = toggleFavoriteResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should apply default favoriteCount (0)', () => {
      const { favoriteCount, ...withoutFavoriteCount } = validToggleResponse;
      const result = toggleFavoriteResponseSchema.safeParse(withoutFavoriteCount);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.favoriteCount).toBe(0);
      }
    });
  });

  describe('invalid input - required fields', () => {
    it('should reject without success', () => {
      const { success, ...withoutSuccess } = validToggleResponse;
      const result = toggleFavoriteResponseSchema.safeParse(withoutSuccess);
      expect(result.success).toBe(false);
    });

    it('should reject without isFavorite', () => {
      const { isFavorite, ...withoutIsFavorite } = validToggleResponse;
      const result = toggleFavoriteResponseSchema.safeParse(withoutIsFavorite);
      expect(result.success).toBe(false);
    });
  });

  describe('invalid input - field validation', () => {
    it('should reject non-boolean success', () => {
      const invalidResponse = createMockToggleFavoriteResponse({ success: 'true' as unknown as boolean });
      const result = toggleFavoriteResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean isFavorite', () => {
      const invalidResponse = createMockToggleFavoriteResponse({ isFavorite: 'true' as unknown as boolean });
      const result = toggleFavoriteResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer favoriteCount', () => {
      const invalidResponse = createMockToggleFavoriteResponse({ favoriteCount: 3.5 });
      const result = toggleFavoriteResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should reject negative favoriteCount', () => {
      const invalidResponse = createMockToggleFavoriteResponse({ favoriteCount: -1 });
      const result = toggleFavoriteResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('type inference', () => {
    it('should infer correct types from valid response', () => {
      const result = toggleFavoriteResponseSchema.safeParse(validToggleResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        const parsed = result.data;
        expect(typeof parsed.success).toBe('boolean');
        expect(typeof parsed.isFavorite).toBe('boolean');
        expect(typeof parsed.favoriteCount).toBe('number');
      }
    });
  });
});

describe('Favorite schema integration', () => {
  it('should handle complete favorite flow', () => {
    // Create input
    const inputResult = createFavoriteInputSchema.safeParse({ resourceId: '660e8400-e29b-41d4-a716-446655440001' });
    expect(inputResult.success).toBe(true);

    // Full favorite object
    const fullFavorite = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      resourceId: '660e8400-e29b-41d4-a716-446655440001',
      userId: '770e8400-e29b-41d4-a716-446655440002',
      createdAt: '2026-03-31T10:00:00.000Z',
    };
    const fullResult = resourceFavoriteSchema.safeParse(fullFavorite);
    expect(fullResult.success).toBe(true);

    // Toggle response
    const toggleResult = toggleFavoriteResponseSchema.safeParse({
      success: true,
      isFavorite: true,
      favoriteCount: 1,
    });
    expect(toggleResult.success).toBe(true);
  });
});
