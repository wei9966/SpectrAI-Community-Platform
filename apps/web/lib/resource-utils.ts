import { ResourceType } from '@spectrai-community/shared';

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
