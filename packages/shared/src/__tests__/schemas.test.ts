import { describe, it, expect } from 'vitest';
import { workflowContentSchema } from '../schemas/workflow.schema';
import { skillContentSchema } from '../schemas/skill.schema';
import { teamContentSchema } from '../schemas/team.schema';
import { mcpContentSchema } from '../schemas/mcp.schema';
import { createResourceInputSchema, publicResourceSchema, resourceTypeSchema } from '../schemas/resource.schema';

describe('workflowContentSchema', () => {
  const validWorkflow = {
    name: 'Test Workflow',
    description: 'A test workflow description',
    version: '1.0.0',
    author: 'test-author',
    tags: ['test', 'workflow'],
    steps: [
      {
        id: 'step-1',
        name: 'Step 1',
        type: 'action',
        config: { key: 'value' },
      },
    ],
    triggers: [
      {
        type: 'schedule',
        config: { cron: '0 0 * * *' },
      },
    ],
    variables: [
      {
        name: 'VAR1',
        type: 'string',
        defaultValue: 'default',
      },
    ],
  };

  it('should validate a valid workflow content', () => {
    const result = workflowContentSchema.safeParse(validWorkflow);
    expect(result.success).toBe(true);
  });

  it('should reject workflow without required fields', () => {
    const result = workflowContentSchema.safeParse({
      description: 'Missing name and steps',
    });
    expect(result.success).toBe(false);
  });

  it('should reject workflow without steps', () => {
    const result = workflowContentSchema.safeParse({
      name: 'Test',
      description: 'Test',
      version: '1.0.0',
    });
    expect(result.success).toBe(false);
  });

  it('should accept workflow without optional fields', () => {
    const minimalWorkflow = {
      name: 'Minimal Workflow',
      description: 'A minimal workflow',
      version: '1.0.0',
      steps: [{ id: 'step1', name: 'Step', type: 'action', config: {} }],
    };
    const result = workflowContentSchema.safeParse(minimalWorkflow);
    expect(result.success).toBe(true);
  });

  it('should reject steps with missing required fields', () => {
    const invalidSteps = {
      ...validWorkflow,
      steps: [{ id: 'step-1' }], // missing name, type, config
    };
    const result = workflowContentSchema.safeParse(invalidSteps);
    expect(result.success).toBe(false);
  });

  it('should accept empty tags array', () => {
    const workflowWithEmptyTags = {
      ...validWorkflow,
      tags: [],
    };
    const result = workflowContentSchema.safeParse(workflowWithEmptyTags);
    expect(result.success).toBe(true);
  });

  it('should accept empty triggers array', () => {
    const workflowWithEmptyTriggers = {
      ...validWorkflow,
      triggers: [],
    };
    const result = workflowContentSchema.safeParse(workflowWithEmptyTriggers);
    expect(result.success).toBe(true);
  });

  it('should accept empty variables array', () => {
    const workflowWithEmptyVariables = {
      ...validWorkflow,
      variables: [],
    };
    const result = workflowContentSchema.safeParse(workflowWithEmptyVariables);
    expect(result.success).toBe(true);
  });
});

describe('skillContentSchema', () => {
  const validSkill = {
    name: 'Test Skill',
    description: 'A test skill description',
    version: '1.0.0',
    author: 'test-author',
    tags: ['test', 'skill'],
    command: 'echo "hello"',
    promptTemplate: 'Hello {{name}}!',
    variables: [
      {
        name: 'name',
        type: 'string',
        defaultValue: 'World',
      },
    ],
  };

  it('should validate a valid skill content', () => {
    const result = skillContentSchema.safeParse(validSkill);
    expect(result.success).toBe(true);
  });

  it('should reject skill without required command', () => {
    const { command, ...withoutCommand } = validSkill;
    const result = skillContentSchema.safeParse(withoutCommand);
    expect(result.success).toBe(false);
  });

  it('should reject skill without required promptTemplate', () => {
    const { promptTemplate, ...withoutTemplate } = validSkill;
    const result = skillContentSchema.safeParse(withoutTemplate);
    expect(result.success).toBe(false);
  });

  it('should accept skill without optional variables', () => {
    const { variables, ...withoutVariables } = validSkill;
    const result = skillContentSchema.safeParse(withoutVariables);
    expect(result.success).toBe(true);
  });

  it('should reject variables with missing required fields', () => {
    const invalidSkill = {
      ...validSkill,
      variables: [{ name: 'var1' }], // missing type
    };
    const result = skillContentSchema.safeParse(invalidSkill);
    expect(result.success).toBe(false);
  });

  it('should accept variables with optional defaultValue', () => {
    const skillWithOptionalDefault = {
      ...validSkill,
      variables: [{ name: 'var1', type: 'string' }],
    };
    const result = skillContentSchema.safeParse(skillWithOptionalDefault);
    expect(result.success).toBe(true);
  });
});

describe('teamContentSchema', () => {
  const validTeam = {
    name: 'Test Team',
    description: 'A test team description',
    version: '1.0.0',
    author: 'test-author',
    tags: ['test', 'team'],
    roles: [
      {
        id: 'role-1',
        name: 'Admin',
        description: 'Team administrator',
        permissions: ['read', 'write', 'delete'],
      },
    ],
  };

  it('should validate a valid team content', () => {
    const result = teamContentSchema.safeParse(validTeam);
    expect(result.success).toBe(true);
  });

  it('should reject team without required roles', () => {
    const { roles, ...withoutRoles } = validTeam;
    const result = teamContentSchema.safeParse(withoutRoles);
    expect(result.success).toBe(false);
  });

  it('should reject team with empty roles array', () => {
    const teamWithEmptyRoles = {
      ...validTeam,
      roles: [],
    };
    const result = teamContentSchema.safeParse(teamWithEmptyRoles);
    expect(result.success).toBe(false);
  });

  it('should reject role with missing permissions', () => {
    const invalidTeam = {
      ...validTeam,
      roles: [{ id: 'role-1', name: 'Admin', description: 'Admin role' }],
    };
    const result = teamContentSchema.safeParse(invalidTeam);
    expect(result.success).toBe(false);
  });

  it('should accept team without optional tags', () => {
    const { tags, ...withoutTags } = validTeam;
    const result = teamContentSchema.safeParse(withoutTags);
    expect(result.success).toBe(true);
  });

  it('should reject role with empty permissions array', () => {
    const invalidTeam = {
      ...validTeam,
      roles: [
        {
          id: 'role-1',
          name: 'Admin',
          description: 'Admin role',
          permissions: [],
        },
      ],
    };
    const result = teamContentSchema.safeParse(invalidTeam);
    expect(result.success).toBe(false);
  });
});

describe('mcpContentSchema', () => {
  const validMcp = {
    name: 'Test MCP',
    description: 'A test MCP server description',
    version: '1.0.0',
    author: 'test-author',
    tags: ['test', 'mcp'],
    command: 'npx',
    args: ['-y', 'some-package'],
    env: {
      API_KEY: 'secret',
    },
  };

  it('should validate a valid MCP content', () => {
    const result = mcpContentSchema.safeParse(validMcp);
    expect(result.success).toBe(true);
  });

  it('should reject MCP without required command', () => {
    const { command, ...withoutCommand } = validMcp;
    const result = mcpContentSchema.safeParse(withoutCommand);
    expect(result.success).toBe(false);
  });

  it('should accept MCP without optional args', () => {
    const { args, ...withoutArgs } = validMcp;
    const result = mcpContentSchema.safeParse(withoutArgs);
    expect(result.success).toBe(true);
  });

  it('should accept MCP without optional env', () => {
    const { env, ...withoutEnv } = validMcp;
    const result = mcpContentSchema.safeParse(withoutEnv);
    expect(result.success).toBe(true);
  });

  it('should accept MCP with empty args array', () => {
    const mcpWithEmptyArgs = {
      ...validMcp,
      args: [],
    };
    const result = mcpContentSchema.safeParse(mcpWithEmptyArgs);
    expect(result.success).toBe(true);
  });

  it('should accept MCP with empty env object', () => {
    const mcpWithEmptyEnv = {
      ...validMcp,
      env: {},
    };
    const result = mcpContentSchema.safeParse(mcpWithEmptyEnv);
    expect(result.success).toBe(true);
  });

  it('should reject MCP with non-string env values', () => {
    const mcpWithInvalidEnv = {
      ...validMcp,
      env: {
        API_KEY: 123, // should be string
      },
    };
    const result = mcpContentSchema.safeParse(mcpWithInvalidEnv);
    expect(result.success).toBe(false);
  });
});

describe('Schema type inference', () => {
  it('should infer correct types from workflow schema', () => {
    const result = workflowContentSchema.safeParse({
      name: 'Test',
      description: 'Test',
      version: '1.0.0',
      steps: [{ id: 's1', name: 'Step 1', type: 'action', config: {} }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const parsed = result.data;
      expect(typeof parsed.name).toBe('string');
      expect(Array.isArray(parsed.steps)).toBe(true);
    }
  });

  it('should infer correct types from skill schema', () => {
    const result = skillContentSchema.safeParse({
      name: 'Test',
      description: 'Test',
      version: '1.0.0',
      command: 'echo',
      promptTemplate: 'Hello',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const parsed = result.data;
      expect(typeof parsed.command).toBe('string');
      expect(typeof parsed.promptTemplate).toBe('string');
    }
  });

  it('should infer correct types from team schema', () => {
    const result = teamContentSchema.safeParse({
      name: 'Test',
      description: 'Test',
      version: '1.0.0',
      roles: [
        {
          id: 'r1',
          name: 'Role 1',
          description: 'A role',
          permissions: ['read'],
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const parsed = result.data;
      expect(Array.isArray(parsed.roles)).toBe(true);
      expect(Array.isArray(parsed.roles[0].permissions)).toBe(true);
    }
  });

  it('should infer correct types from mcp schema', () => {
    const result = mcpContentSchema.safeParse({
      name: 'Test',
      description: 'Test',
      version: '1.0.0',
      command: 'npx',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const parsed = result.data;
      expect(typeof parsed.command).toBe('string');
      expect(parsed.args).toBeUndefined();
      expect(parsed.env).toBeUndefined();
    }
  });
});

describe('resourceTypeSchema', () => {
  it('should accept valid resource types', () => {
    const types = ['workflow', 'team', 'skill', 'mcp'] as const;
    types.forEach((type) => {
      const result = resourceTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid resource types', () => {
    const result = resourceTypeSchema.safeParse('invalid');
    expect(result.success).toBe(false);
  });
});

describe('createResourceInputSchema', () => {
  const validWorkflowContent = {
    name: 'Test Workflow',
    description: 'A test workflow',
    version: '1.0.0',
    steps: [{ id: 's1', name: 'Step 1', type: 'action', config: {} }],
  };

  it('should validate a valid resource creation input', () => {
    const input = {
      name: 'Test Resource',
      type: 'workflow',
      content: validWorkflowContent,
    };
    const result = createResourceInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject resource without name', () => {
    const input = {
      type: 'workflow',
      content: validWorkflowContent,
    };
    const result = createResourceInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject resource with name exceeding 100 characters', () => {
    const input = {
      name: 'a'.repeat(101),
      type: 'workflow',
      content: validWorkflowContent,
    };
    const result = createResourceInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject resource with description exceeding 1000 characters', () => {
    const input = {
      name: 'Test',
      description: 'a'.repeat(1001),
      type: 'workflow',
      content: validWorkflowContent,
    };
    const result = createResourceInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject resource with invalid type', () => {
    const input = {
      name: 'Test Resource',
      type: 'invalid',
      content: validWorkflowContent,
    };
    const result = createResourceInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should apply default values', () => {
    const input = {
      name: 'Test Resource',
      type: 'workflow',
      content: validWorkflowContent,
    };
    const result = createResourceInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
      expect(result.data.version).toBe('1.0.0');
      expect(result.data.isPublished).toBe(false);
    }
  });

  it('should accept resource with valid tags', () => {
    const input = {
      name: 'Test Resource',
      type: 'skill',
      content: {
        name: 'Test Skill',
        description: 'A skill',
        version: '1.0.0',
        command: 'echo',
        promptTemplate: 'Hello',
      },
      tags: ['ai', 'automation'],
    };
    const result = createResourceInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept null description', () => {
    const input = {
      name: 'Test Resource',
      description: null,
      type: 'mcp',
      content: {
        name: 'Test MCP',
        description: 'A MCP',
        version: '1.0.0',
        command: 'npx',
      },
    };
    const result = createResourceInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe('publicResourceSchema', () => {
  const validPublicResource = {
    id: 'resource-123',
    name: 'Test Resource',
    description: 'A public resource',
    type: 'workflow' as const,
    content: {
      name: 'Test Workflow',
      description: 'A workflow',
      version: '1.0.0',
      steps: [],
    },
    author: {
      id: 'user-123',
      username: 'testuser',
      avatarUrl: null,
    },
    downloads: 10,
    likes: 5,
    tags: ['test'],
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('should validate a valid public resource', () => {
    const result = publicResourceSchema.safeParse(validPublicResource);
    expect(result.success).toBe(true);
  });

  it('should reject resource without author', () => {
    const { author, ...withoutAuthor } = validPublicResource;
    const result = publicResourceSchema.safeParse(withoutAuthor);
    expect(result.success).toBe(false);
  });

  it('should accept resource with null description', () => {
    const resource = { ...validPublicResource, description: null };
    const result = publicResourceSchema.safeParse(resource);
    expect(result.success).toBe(true);
  });

  it('should apply default values', () => {
    const { downloads, likes, tags, ...withoutDefaults } = validPublicResource;
    const result = publicResourceSchema.safeParse(withoutDefaults);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.downloads).toBe(0);
      expect(result.data.likes).toBe(0);
      expect(result.data.tags).toEqual([]);
    }
  });

  it('should accept string dates', () => {
    const result = publicResourceSchema.safeParse(validPublicResource);
    expect(result.success).toBe(true);
  });

  it('should accept Date objects', () => {
    const resource = {
      ...validPublicResource,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = publicResourceSchema.safeParse(resource);
    expect(result.success).toBe(true);
  });

  it('should reject resource with invalid type', () => {
    const resource = { ...validPublicResource, type: 'invalid' };
    const result = publicResourceSchema.safeParse(resource);
    expect(result.success).toBe(false);
  });
});
