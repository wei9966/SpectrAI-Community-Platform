import { describe, it, expect } from 'vitest';
import {
  projectSchema,
  projectStatusSchema,
  toolChainItemSchema,
  createProjectInputSchema,
  updateProjectInputSchema,
  projectWithRelationsSchema,
} from '../schemas/project';

// ============================================================================
// Test Factory Functions
// ============================================================================

/**
 * Creates a valid mock project object
 */
export function createMockProject(overrides?: Partial<typeof validProject>) {
  return { ...validProject, ...overrides };
}

/**
 * Creates a valid mock project input (for creation)
 */
export function createMockProjectInput(overrides?: Partial<typeof validProjectInput>) {
  return { ...validProjectInput, ...overrides };
}

/**
 * Creates a valid mock tool chain item
 */
export function createMockToolChainItem(overrides?: Partial<typeof validToolChainItem>) {
  return { ...validToolChainItem, ...overrides };
}

/**
 * Creates a valid mock project with relations
 */
export function createMockProjectWithRelations(overrides?: Partial<typeof validProjectWithRelations>) {
  return { ...validProjectWithRelations, ...overrides };
}

// ============================================================================
// Mock Data
// ============================================================================

const validProject = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'My Awesome Project',
  description: 'A detailed description of my project',
  coverImageUrl: 'https://example.com/cover.jpg',
  demoUrl: 'https://example.com/demo',
  sourceUrl: 'https://github.com/user/repo',
  userId: '770e8400-e29b-41d4-a716-446655440002',
  status: 'published' as const,
  toolChain: [
    {
      name: 'Video Workflow',
      type: 'workflow' as const,
      resourceId: '880e8400-e29b-41d4-a716-446655440003',
      version: '1.0.0',
    },
  ],
  tags: ['ai', 'video', 'automation'],
  createdAt: '2026-03-31T10:00:00.000Z',
  updatedAt: '2026-03-31T10:00:00.000Z',
};

const validProjectInput = {
  title: 'My New Project',
  description: 'Project description',
  coverImageUrl: 'https://example.com/cover.jpg',
  demoUrl: 'https://example.com/demo',
  sourceUrl: 'https://github.com/user/repo',
  status: 'draft' as const,
  toolChain: [],
  tags: ['new'],
  resourceIds: ['880e8400-e29b-41d4-a716-446655440003'],
};

const validToolChainItem = {
  name: 'Test Tool',
  type: 'skill' as const,
  resourceId: '880e8400-e29b-41d4-a716-446655440003',
  version: '1.0.0',
};

const validProjectWithRelations = {
  ...validProject,
  resources: [
    {
      id: '880e8400-e29b-41d4-a716-446655440003',
      name: 'Video Workflow',
      description: 'A video processing workflow',
      type: 'workflow' as const,
    },
  ],
};

// ============================================================================
// Tests
// ============================================================================

describe('projectStatusSchema', () => {
  it('should accept valid status values', () => {
    ['draft', 'published', 'archived'].forEach((status) => {
      const result = projectStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid status values', () => {
    const result = projectStatusSchema.safeParse('invalid');
    expect(result.success).toBe(false);
  });
});

describe('toolChainItemSchema', () => {
  describe('valid input', () => {
    it('should validate a valid tool chain item', () => {
      const result = toolChainItemSchema.safeParse(validToolChainItem);
      expect(result.success).toBe(true);
    });

    it('should accept without optional resourceId', () => {
      const { resourceId, ...withoutResourceId } = validToolChainItem;
      const result = toolChainItemSchema.safeParse(withoutResourceId);
      expect(result.success).toBe(true);
    });

    it('should accept without optional version', () => {
      const { version, ...withoutVersion } = validToolChainItem;
      const result = toolChainItemSchema.safeParse(withoutVersion);
      expect(result.success).toBe(true);
    });

    it('should accept all valid tool types', () => {
      ['workflow', 'skill', 'team', 'mcp'].forEach((type) => {
        const item = { ...validToolChainItem, type };
        const result = toolChainItemSchema.safeParse(item);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('invalid input', () => {
    it('should reject without name', () => {
      const { name, ...withoutName } = validToolChainItem;
      const result = toolChainItemSchema.safeParse(withoutName);
      expect(result.success).toBe(false);
    });

    it('should reject without type', () => {
      const { type, ...withoutType } = validToolChainItem;
      const result = toolChainItemSchema.safeParse(withoutType);
      expect(result.success).toBe(false);
    });

    it('should reject with invalid type', () => {
      const invalidItem = { ...validToolChainItem, type: 'invalid' };
      const result = toolChainItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should reject with invalid UUID format for resourceId', () => {
      const invalidItem = { ...validToolChainItem, resourceId: 'invalid-uuid' };
      const result = toolChainItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });
  });
});

describe('projectSchema', () => {
  describe('valid input', () => {
    it('should validate a valid project with all fields', () => {
      const result = projectSchema.safeParse(validProject);
      expect(result.success).toBe(true);
    });

    it('should accept project with Date object timestamps', () => {
      const projectWithDates = {
        ...validProject,
        createdAt: new Date('2026-03-31T10:00:00.000Z'),
        updatedAt: new Date('2026-03-31T10:00:00.000Z'),
      };
      const result = projectSchema.safeParse(projectWithDates);
      expect(result.success).toBe(true);
    });

    it('should accept project with null optional fields', () => {
      const projectWithNulls = {
        ...validProject,
        description: null,
        coverImageUrl: null,
        demoUrl: null,
        sourceUrl: null,
      };
      const result = projectSchema.safeParse(projectWithNulls);
      expect(result.success).toBe(true);
    });

    it('should accept project without optional fields', () => {
      const minimalProject = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Minimal Project',
        userId: '770e8400-e29b-41d4-a716-446655440002',
        createdAt: '2026-03-31T10:00:00.000Z',
        updatedAt: '2026-03-31T10:00:00.000Z',
      };
      const result = projectSchema.safeParse(minimalProject);
      expect(result.success).toBe(true);
    });

    it('should accept empty toolChain array', () => {
      const project = createMockProject({ toolChain: [] });
      const result = projectSchema.safeParse(project);
      expect(result.success).toBe(true);
    });

    it('should accept empty tags array', () => {
      const project = createMockProject({ tags: [] });
      const result = projectSchema.safeParse(project);
      expect(result.success).toBe(true);
    });

    it('should apply default status (published)', () => {
      const { status, ...withoutStatus } = validProject;
      const result = projectSchema.safeParse(withoutStatus);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('published');
      }
    });
  });

  describe('invalid input - required fields', () => {
    it('should reject without id', () => {
      const { id, ...withoutId } = validProject;
      const result = projectSchema.safeParse(withoutId);
      expect(result.success).toBe(false);
    });

    it('should reject without title', () => {
      const { title, ...withoutTitle } = validProject;
      const result = projectSchema.safeParse(withoutTitle);
      expect(result.success).toBe(false);
    });

    it('should reject without userId', () => {
      const { userId, ...withoutUserId } = validProject;
      const result = projectSchema.safeParse(withoutUserId);
      expect(result.success).toBe(false);
    });

    it('should reject without createdAt', () => {
      const { createdAt, ...withoutCreatedAt } = validProject;
      const result = projectSchema.safeParse(withoutCreatedAt);
      expect(result.success).toBe(false);
    });

    it('should reject without updatedAt', () => {
      const { updatedAt, ...withoutUpdatedAt } = validProject;
      const result = projectSchema.safeParse(withoutUpdatedAt);
      expect(result.success).toBe(false);
    });
  });

  describe('invalid input - field validation', () => {
    it('should reject invalid UUID format for id', () => {
      const invalid = createMockProject({ id: 'invalid-uuid' });
      const result = projectSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format for userId', () => {
      const invalid = createMockProject({ userId: 'invalid-uuid' });
      const result = projectSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject title exceeding 200 characters', () => {
      const invalid = createMockProject({ title: 'a'.repeat(201) });
      const result = projectSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject empty title', () => {
      const invalid = createMockProject({ title: '' });
      const result = projectSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject description exceeding 2000 characters', () => {
      const invalid = createMockProject({ description: 'a'.repeat(2001) });
      const result = projectSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL format for coverImageUrl', () => {
      const invalid = createMockProject({ coverImageUrl: 'not-a-url' });
      const result = projectSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL format for demoUrl', () => {
      const invalid = createMockProject({ demoUrl: 'not-a-url' });
      const result = projectSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL format for sourceUrl', () => {
      const invalid = createMockProject({ sourceUrl: 'not-a-url' });
      const result = projectSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid status value', () => {
      const invalid = createMockProject({ status: 'invalid' as const });
      const result = projectSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject tool chain item with invalid type', () => {
      const invalid = createMockProject({
        toolChain: [{ ...validToolChainItem, type: 'invalid' as const }],
      });
      const result = projectSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('boundary values', () => {
    it('should accept title with exactly 200 characters', () => {
      const project = createMockProject({ title: 'a'.repeat(200) });
      const result = projectSchema.safeParse(project);
      expect(result.success).toBe(true);
    });

    it('should accept description with exactly 2000 characters', () => {
      const project = createMockProject({ description: 'a'.repeat(2000) });
      const result = projectSchema.safeParse(project);
      expect(result.success).toBe(true);
    });
  });

  describe('type inference', () => {
    it('should infer correct types from valid project', () => {
      const result = projectSchema.safeParse(validProject);
      expect(result.success).toBe(true);
      if (result.success) {
        const parsed = result.data;
        expect(typeof parsed.id).toBe('string');
        expect(typeof parsed.title).toBe('string');
        expect(typeof parsed.userId).toBe('string');
        expect(Array.isArray(parsed.toolChain)).toBe(true);
        expect(Array.isArray(parsed.tags)).toBe(true);
      }
    });
  });
});

describe('createProjectInputSchema', () => {
  describe('valid input', () => {
    it('should validate a valid project input', () => {
      const result = createProjectInputSchema.safeParse(validProjectInput);
      expect(result.success).toBe(true);
    });

    it('should accept without optional fields', () => {
      const minimalInput = {
        title: 'New Project',
      };
      const result = createProjectInputSchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
    });

    it('should accept with resourceIds array', () => {
      const input = createMockProjectInput({ resourceIds: ['880e8400-e29b-41d4-a716-446655440003'] });
      const result = createProjectInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept without resourceIds array', () => {
      const { resourceIds, ...withoutResourceIds } = validProjectInput;
      const result = createProjectInputSchema.safeParse(withoutResourceIds);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid input', () => {
    it('should reject without title', () => {
      const { title, ...withoutTitle } = validProjectInput;
      const result = createProjectInputSchema.safeParse(withoutTitle);
      expect(result.success).toBe(false);
    });

    it('should reject empty title', () => {
      const invalid = createMockProjectInput({ title: '' });
      const result = createProjectInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject title exceeding 200 characters', () => {
      const invalid = createMockProjectInput({ title: 'a'.repeat(201) });
      const result = createProjectInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID in resourceIds', () => {
      const invalid = createMockProjectInput({ resourceIds: ['invalid-uuid'] });
      const result = createProjectInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL format', () => {
      const invalid = createMockProjectInput({ coverImageUrl: 'not-a-url' });
      const result = createProjectInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});

describe('updateProjectInputSchema', () => {
  describe('valid input', () => {
    it('should validate with all fields', () => {
      const result = updateProjectInputSchema.safeParse(validProjectInput);
      expect(result.success).toBe(true);
    });

    it('should validate with empty object (all optional)', () => {
      const result = updateProjectInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate with partial fields', () => {
      const result = updateProjectInputSchema.safeParse({ title: 'Updated Title' });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid input', () => {
    it('should reject empty title', () => {
      const result = updateProjectInputSchema.safeParse({ title: '' });
      expect(result.success).toBe(false);
    });

    it('should reject title exceeding 200 characters', () => {
      const result = updateProjectInputSchema.safeParse({ title: 'a'.repeat(201) });
      expect(result.success).toBe(false);
    });

    it('should reject invalid status', () => {
      const result = updateProjectInputSchema.safeParse({ status: 'invalid' });
      expect(result.success).toBe(false);
    });
  });
});

describe('projectWithRelationsSchema', () => {
  describe('valid input', () => {
    it('should validate a project with relations', () => {
      const result = projectWithRelationsSchema.safeParse(validProjectWithRelations);
      expect(result.success).toBe(true);
    });

    it('should accept empty resources array', () => {
      const project = { ...validProject, resources: [] };
      const result = projectWithRelationsSchema.safeParse(project);
      expect(result.success).toBe(true);
    });

    it('should apply default empty resources array', () => {
      const { resources, ...withoutResources } = validProjectWithRelations;
      const result = projectWithRelationsSchema.safeParse(withoutResources);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.resources).toEqual([]);
      }
    });
  });

  describe('invalid input', () => {
    it('should reject resource with invalid type', () => {
      const invalid = createMockProjectWithRelations({
        resources: [
          {
            id: '880e8400-e29b-41d4-a716-446655440003',
            name: 'Test',
            description: 'Test',
            type: 'invalid' as const,
          },
        ],
      });
      const result = projectWithRelationsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});

describe('Project schema integration', () => {
  it('should handle complete project lifecycle', () => {
    // Create
    const createResult = createProjectInputSchema.safeParse({ title: 'New Project' });
    expect(createResult.success).toBe(true);

    // Full project
    const fullResult = projectSchema.safeParse(validProject);
    expect(fullResult.success).toBe(true);

    // Update
    const updateResult = updateProjectInputSchema.safeParse({ title: 'Updated Title' });
    expect(updateResult.success).toBe(true);

    // With relations
    const relationsResult = projectWithRelationsSchema.safeParse(validProjectWithRelations);
    expect(relationsResult.success).toBe(true);
  });
});
