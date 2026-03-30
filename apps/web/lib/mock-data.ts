import type { PublicResource, PublicUser, PublicComment } from '@spectrai-community/shared';
import { ResourceType } from '@spectrai-community/shared';

export const mockResources: PublicResource[] = [
  {
    id: '1',
    name: 'SpectrAI 多会话编排 Workflow',
    description: '自动管理多个 AI CLI 会话，实现任务分配、进度跟踪和结果汇总的完整工作流',
    type: ResourceType.WORKFLOW,
    author: {
      id: 'user1',
      username: 'AIBuilder',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AIBuilder',
    },
    isPublished: true,
    version: '1.2.0',
    tags: ['自动化', '会话管理', '效率工具'],
    content: {
      name: '多会话编排工作流',
      description: '自动管理多个 AI CLI 会话，实现任务分配、进度跟踪和结果汇总的完整工作流',
      version: '1.2.0',
      steps: [
        { id: 'step1', name: '分析任务', type: 'analysis', config: { agent: 'planner' } },
        { id: 'step2', name: '分配子任务', type: 'coordination', config: { agent: 'coordinator' } },
        { id: 'step3', name: '执行任务', type: 'execution', config: { agent: 'worker' } },
        { id: 'step4', name: '汇总结果', type: 'reporting', config: { agent: 'reporter' } }
      ]
    },
    downloads: 1234,
    likes: 567,
    createdAt: new Date('2025-03-15T10:00:00Z'),
    updatedAt: new Date('2025-03-28T15:30:00Z'),
  },
  {
    id: '2',
    name: '前端开发专家团队 Team',
    description: '包含 React、Vue、Angular 专家的完整前端开发团队配置',
    type: ResourceType.TEAM,
    author: {
      id: 'user2',
      username: 'TeamMaster',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TeamMaster',
    },
    isPublished: true,
    version: '2.0.1',
    tags: ['前端', 'React', 'Vue', 'Angular'],
    content: {
      name: '前端专家团队',
      description: '包含 React、Vue、Angular 专家的完整前端开发团队配置',
      version: '2.0.1',
      roles: [
        { id: 'role1', name: 'React 专家', description: '负责 React/Next.js 开发', permissions: ['read', 'write'] },
        { id: 'role2', name: 'Vue 专家', description: '负责 Vue/Nuxt 开发', permissions: ['read', 'write'] },
        { id: 'role3', name: 'Angular 专家', description: '负责 Angular 开发', permissions: ['read', 'write'] }
      ]
    },
    downloads: 892,
    likes: 421,
    createdAt: new Date('2025-03-10T08:00:00Z'),
    updatedAt: new Date('2025-03-25T12:00:00Z'),
  },
  {
    id: '3',
    name: '代码审查 Skill',
    description: '自动检测代码质量问题、安全漏洞和性能问题的智能审查技能',
    type: ResourceType.SKILL,
    author: {
      id: 'user3',
      username: 'CodeReviewer',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CodeReviewer',
    },
    isPublished: true,
    version: '1.5.0',
    tags: ['代码质量', '安全', '性能'],
    content: {
      name: '智能代码审查',
      description: '自动检测代码质量问题、安全漏洞和性能问题的智能审查技能',
      version: '1.5.0',
      command: '/code-review',
      promptTemplate: '请审查以下代码...'
    },
    downloads: 2156,
    likes: 983,
    createdAt: new Date('2025-03-01T09:00:00Z'),
    updatedAt: new Date('2025-03-29T14:00:00Z'),
  },
  {
    id: '4',
    name: 'GitHub MCP Server',
    description: '完整的 GitHub API 集成，支持 Issue、PR、Repository 管理',
    type: ResourceType.MCP,
    author: {
      id: 'user4',
      username: 'MCPPublisher',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MCPPublisher',
    },
    isPublished: true,
    version: '3.1.0',
    tags: ['GitHub', 'API', 'DevOps'],
    content: {
      name: 'GitHub MCP',
      description: '完整的 GitHub API 集成，支持 Issue、PR、Repository 管理',
      version: '3.1.0',
      command: 'npx',
      args: ['@modelcontextprotocol/server-github']
    },
    downloads: 3421,
    likes: 1567,
    createdAt: new Date('2025-02-20T11:00:00Z'),
    updatedAt: new Date('2025-03-27T16:00:00Z'),
  },
  {
    id: '5',
    name: '数据分析 Workflow',
    description: '从数据导入、清洗、分析到可视化的完整数据分析流程',
    type: ResourceType.WORKFLOW,
    author: {
      id: 'user5',
      username: 'DataPro',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DataPro',
    },
    isPublished: true,
    version: '1.0.3',
    tags: ['数据分析', '可视化', 'Python'],
    content: {
      name: '数据分析工作流',
      description: '从数据导入、清洗、分析到可视化的完整数据分析流程',
      version: '1.0.3',
      steps: [
        { id: 'step1', name: '导入数据', type: 'input', config: {} },
        { id: 'step2', name: '数据清洗', type: 'transform', config: {} },
        { id: 'step3', name: '探索性分析', type: 'analysis', config: {} },
        { id: 'step4', name: '建模', type: 'model', config: {} },
        { id: 'step5', name: '可视化', type: 'output', config: {} }
      ]
    },
    downloads: 756,
    likes: 342,
    createdAt: new Date('2025-03-18T13:00:00Z'),
    updatedAt: new Date('2025-03-26T10:00:00Z'),
  },
  {
    id: '6',
    name: 'Prompt 优化 Skill',
    description: '自动优化 AI 提示词，提升输出质量和准确率的智能技能',
    type: ResourceType.SKILL,
    author: {
      id: 'user6',
      username: 'PromptEng',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PromptEng',
    },
    isPublished: true,
    version: '2.1.0',
    tags: ['Prompt', 'AI 优化', '效率'],
    content: {
      name: 'Prompt 优化器',
      description: '自动优化 AI 提示词，提升输出质量和准确率的智能技能',
      version: '2.1.0',
      command: '/optimize-prompt',
      promptTemplate: '请优化以下提示词...'
    },
    downloads: 1876,
    likes: 823,
    createdAt: new Date('2025-03-05T07:00:00Z'),
    updatedAt: new Date('2025-03-28T09:00:00Z'),
  },
];

export const mockComments: PublicComment[] = [
  {
    id: 'c1',
    resourceId: '1',
    user: {
      id: 'u1',
      username: 'DevUser123',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DevUser123',
    },
    content: '非常好用的工作流！帮我们团队提升了至少 30% 的效率。强烈推荐给需要管理多个 AI 会话的团队。',
    createdAt: new Date('2025-03-28T10:00:00Z'),
  },
  {
    id: 'c2',
    resourceId: '1',
    user: {
      id: 'u2',
      username: 'TechLead',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TechLead',
    },
    content: '配置简单，文档清晰。希望能增加更多的自定义选项。',
    createdAt: new Date('2025-03-27T15:00:00Z'),
  },
  {
    id: 'c3',
    resourceId: '1',
    user: {
      id: 'u3',
      username: 'NewbieCoder',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NewbieCoder',
    },
    content: '新手友好，按照文档很快就上手了。谢谢作者分享！',
    createdAt: new Date('2025-03-26T09:00:00Z'),
  }
];

export const mockUser: PublicUser = {
  id: 'user1',
  username: 'AIBuilder',
  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AIBuilder',
  bio: '专注 AI 工具开发，喜欢创造提升效率的工作流和工具。开源爱好者，欢迎交流！',
  createdAt: new Date('2025-01-15T00:00:00Z'),
};

// 辅助函数
export const getResourceTypeLabel = (type: ResourceType): string => {
  const labels: Record<ResourceType, string> = {
    [ResourceType.WORKFLOW]: '工作流',
    [ResourceType.TEAM]: '团队配置',
    [ResourceType.SKILL]: '技能',
    [ResourceType.MCP]: 'MCP 服务',
  };
  return labels[type] || type;
};

export const getResourceTypeVariant = (type: ResourceType): string => {
  const variants: Record<ResourceType, string> = {
    [ResourceType.WORKFLOW]: 'workflow',
    [ResourceType.TEAM]: 'team',
    [ResourceType.SKILL]: 'skill',
    [ResourceType.MCP]: 'mcp',
  };
  return variants[type] || 'default';
};
