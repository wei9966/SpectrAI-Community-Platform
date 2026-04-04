"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Code,
  Workflow,
  Users,
  Sparkles,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Edit3,
  ChevronDown,
  ChevronUp,
  Save,
  Terminal,
  MessageSquare,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ResourceType } from "@spectrai-community/shared";
import { ResourceType as ResourceTypeEnum } from "@spectrai-community/shared";

// 类型定义
interface MCPStep {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
}

interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
}

interface SkillVariable {
  name: string;
  type: string;
  defaultValue?: string;
}

interface TeamRole {
  id: string;
  name: string;
  description: string;
  provider: string;
  systemPrompt: string;
}

// 资源类型元数据
const resourceTypeMeta: Record<ResourceType, {
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}> = {
  [ResourceTypeEnum.MCP]: {
    label: "MCP 服务",
    description: "外部工具集成服务",
    icon: Terminal,
    color: "text-blue-500",
  },
  [ResourceTypeEnum.WORKFLOW]: {
    label: "工作流",
    description: "自动化任务编排配置",
    icon: Workflow,
    color: "text-green-500",
  },
  [ResourceTypeEnum.SKILL]: {
    label: "技能",
    description: "AI 能力扩展技能",
    icon: Sparkles,
    color: "text-purple-500",
  },
  [ResourceTypeEnum.TEAM]: {
    label: "团队配置",
    description: "多角色协作配置",
    icon: Users,
    color: "text-orange-500",
  },
};

// 重置表单状态的辅助函数
const getInitialCommonFields = () => ({
  name: "",
  description: "",
  version: "1.0.0",
  tags: "",
});

const getInitialMcpFields = () => ({
  command: "",
  args: [""] as string[],
  envKey: "",
  envValue: "",
  envDescription: "",
  envRequired: false,
  envVars: [] as Array<{ key: string; value: string; description: string; required: boolean }>,
  installCommand: "",
});

const getInitialWorkflowFields = () => ({
  steps: [] as WorkflowStep[],
  newStepName: "",
  newStepType: "prompt",
  newStepConfig: "{}",
});

const getInitialSkillFields = () => ({
  command: "",
  promptTemplate: "",
  variables: [] as SkillVariable[],
  newVarName: "",
  newVarType: "string",
  newVarDefault: "",
});

const getInitialTeamFields = () => ({
  roles: [] as TeamRole[],
  newRoleName: "",
  newRoleDescription: "",
  newRoleProvider: "claude",
  newRoleSystemPrompt: "",
});

export default function PublishPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = React.useState<ResourceType>(ResourceTypeEnum.MCP);
  const [advancedMode, setAdvancedMode] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // 通用字段
  const [commonFields, setCommonFields] = React.useState(getInitialCommonFields());

  // MCP 专属字段
  const [mcpFields, setMcpFields] = React.useState(getInitialMcpFields());

  // Workflow 专属字段
  const [workflowFields, setWorkflowFields] = React.useState(getInitialWorkflowFields());

  // Skill 专属字段
  const [skillFields, setSkillFields] = React.useState(getInitialSkillFields());

  // Team 专属字段
  const [teamFields, setTeamFields] = React.useState(getInitialTeamFields());

  // 高级模式 JSON
  const [jsonContent, setJsonContent] = React.useState("");

  // 切换类型时重置表单
  const handleTypeChange = (type: ResourceType) => {
    if (type !== selectedType) {
      setSelectedType(type);
      // 重置通用字段
      setCommonFields(getInitialCommonFields());
      // 重置高级模式 JSON
      setJsonContent("");
      // 重置错误
      setErrors({});
      // 重置所有类型专属字段
      setMcpFields(getInitialMcpFields());
      setWorkflowFields(getInitialWorkflowFields());
      setSkillFields(getInitialSkillFields());
      setTeamFields(getInitialTeamFields());
    }
  };

  // 生成 ID
  const generateId = () => Math.random().toString(36).substring(2, 9);

  // 验证通用字段
  const validateCommonFields = () => {
    const newErrors: Record<string, string> = {};
    if (!commonFields.name.trim()) {
      newErrors.name = "请输入资源名称";
    }
    if (!commonFields.description.trim()) {
      newErrors.description = "请输入资源描述";
    }
    return newErrors;
  };

  // 构建 content JSON
  const buildContentJson = (): Record<string, unknown> => {
    const base = {
      name: commonFields.name,
      description: commonFields.description,
      version: commonFields.version,
      tags: commonFields.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };

    switch (selectedType) {
      case ResourceTypeEnum.MCP:
        return {
          ...base,
          command: mcpFields.command,
          args: mcpFields.args.filter((a) => a.trim()),
          env: Object.fromEntries(
            mcpFields.envVars.map((e) => [e.key, e.value])
          ),
          installCommand: mcpFields.installCommand,
        };
      case ResourceTypeEnum.WORKFLOW:
        return {
          ...base,
          steps: workflowFields.steps.map((s) => ({
            id: s.id,
            name: s.name,
            type: s.type,
            config: s.config,
          })),
        };
      case ResourceTypeEnum.SKILL:
        return {
          ...base,
          command: skillFields.command.startsWith("/")
            ? skillFields.command
            : `/${skillFields.command}`,
          promptTemplate: skillFields.promptTemplate,
          variables: skillFields.variables,
        };
      case ResourceTypeEnum.TEAM:
        return {
          ...base,
          roles: teamFields.roles.map((r) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            permissions: [r.provider],
            systemPrompt: r.systemPrompt,
          })),
        };
      default:
        return base;
    }
  };

  // 验证类型专属字段
  const validateTypeFields = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    switch (selectedType) {
      case ResourceTypeEnum.MCP:
        if (!mcpFields.command.trim()) {
          newErrors.command = "请输入命令";
        }
        break;
      case ResourceTypeEnum.WORKFLOW:
        if (workflowFields.steps.length === 0) {
          newErrors.steps = "请添加至少一个步骤";
        }
        break;
      case ResourceTypeEnum.SKILL:
        if (!skillFields.command.trim()) {
          newErrors.command = "请输入触发命令";
        }
        if (!skillFields.promptTemplate.trim()) {
          newErrors.promptTemplate = "请输入提示词模板";
        }
        break;
      case ResourceTypeEnum.TEAM:
        if (teamFields.roles.length === 0) {
          newErrors.roles = "请添加至少一个角色";
        }
        break;
    }

    return newErrors;
  };

  // 处理提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const commonErrors = validateCommonFields();
    const typeErrors = validateTypeFields();
    const allErrors = { ...commonErrors, ...typeErrors };

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      let content: Record<string, unknown>;

      if (advancedMode) {
        content = JSON.parse(jsonContent);
      } else {
        content = buildContentJson();
      }

      const createData = {
        name: commonFields.name,
        description: commonFields.description,
        type: selectedType,
        content,
        tags: commonFields.tags.split(",").map((t) => t.trim()).filter(Boolean),
        version: commonFields.version,
      };

      const result = await api.createResource(createData);

      if (result.success) {
        router.push(`/resource/${result.data?.id}`);
      } else {
        setErrors({ submit: result.error || "发布失败" });
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        setErrors({ submit: "JSON 格式错误，请检查" });
      } else {
        setErrors({ submit: "发布失败，请稍后重试" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 获取 JSON 预览
  const getJsonPreview = () => {
    try {
      const content = buildContentJson();
      return JSON.stringify(content, null, 2);
    } catch {
      return "{}";
    }
  };

  // MCP: 添加参数
  const addMcpArg = () => {
    setMcpFields((prev) => ({
      ...prev,
      args: [...prev.args, ""],
    }));
  };

  // MCP: 删除参数
  const removeMcpArg = (index: number) => {
    setMcpFields((prev) => ({
      ...prev,
      args: prev.args.filter((_, i) => i !== index),
    }));
  };

  // MCP: 更新参数
  const updateMcpArg = (index: number, value: string) => {
    setMcpFields((prev) => ({
      ...prev,
      args: prev.args.map((a, i) => (i === index ? value : a)),
    }));
  };

  // MCP: 添加环境变量
  const addMcpEnv = () => {
    if (!mcpFields.envKey.trim()) return;
    setMcpFields((prev) => ({
      ...prev,
      envVars: [
        ...prev.envVars,
        {
          key: prev.envKey,
          value: prev.envValue,
          description: prev.envDescription,
          required: prev.envRequired,
        },
      ],
      envKey: "",
      envValue: "",
      envDescription: "",
      envRequired: false,
    }));
  };

  // MCP: 删除环境变量
  const removeMcpEnv = (key: string) => {
    setMcpFields((prev) => ({
      ...prev,
      envVars: prev.envVars.filter((e) => e.key !== key),
    }));
  };

  // Workflow: 添加步骤
  const addWorkflowStep = () => {
    if (!workflowFields.newStepName.trim()) return;
    try {
      const config = JSON.parse(workflowFields.newStepConfig);
      setWorkflowFields((prev) => ({
        ...prev,
        steps: [
          ...prev.steps,
          {
            id: generateId(),
            name: prev.newStepName,
            type: prev.newStepType,
            config,
          },
        ],
        newStepName: "",
        newStepType: "prompt",
        newStepConfig: "{}",
      }));
    } catch {
      setErrors({ newStepConfig: "步骤配置必须是有效的 JSON" });
    }
  };

  // Workflow: 删除步骤
  const removeWorkflowStep = (id: string) => {
    setWorkflowFields((prev) => ({
      ...prev,
      steps: prev.steps.filter((s) => s.id !== id),
    }));
  };

  // Workflow: 移动步骤
  const moveWorkflowStep = (id: string, direction: "up" | "down") => {
    setWorkflowFields((prev) => {
      const index = prev.steps.findIndex((s) => s.id === id);
      if (index === -1) return prev;
      const newSteps = [...prev.steps];
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= newSteps.length) return prev;
      [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
      return { ...prev, steps: newSteps };
    });
  };

  // Skill: 添加变量
  const addSkillVariable = () => {
    if (!skillFields.newVarName.trim()) return;
    setSkillFields((prev) => ({
      ...prev,
      variables: [
        ...prev.variables,
        {
          name: prev.newVarName,
          type: prev.newVarType,
          defaultValue: prev.newVarDefault,
        },
      ],
      newVarName: "",
      newVarType: "string",
      newVarDefault: "",
    }));
  };

  // Skill: 删除变量
  const removeSkillVariable = (name: string) => {
    setSkillFields((prev) => ({
      ...prev,
      variables: prev.variables.filter((v) => v.name !== name),
    }));
  };

  // Team: 添加角色
  const addTeamRole = () => {
    if (!teamFields.newRoleName.trim()) return;
    setTeamFields((prev) => ({
      ...prev,
      roles: [
        ...prev.roles,
        {
          id: generateId(),
          name: prev.newRoleName,
          description: prev.newRoleDescription,
          provider: prev.newRoleProvider,
          systemPrompt: prev.newRoleSystemPrompt,
        },
      ],
      newRoleName: "",
      newRoleDescription: "",
      newRoleProvider: "claude",
      newRoleSystemPrompt: "",
    }));
  };

  // Team: 删除角色
  const removeTeamRole = (id: string) => {
    setTeamFields((prev) => ({
      ...prev,
      roles: prev.roles.filter((r) => r.id !== id),
    }));
  };

  return (
    <div className="container py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">发布资源</h1>
          <p className="text-muted-foreground">
            分享你的配置到社区，帮助更多人提升效率
          </p>
        </div>

        {/* 资源类型选择 - 大卡片式 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Object.entries(resourceTypeMeta).map(([type, meta]) => {
            const Icon = meta.icon;
            const isSelected = selectedType === type;
            return (
              <button
                key={type}
                onClick={() => handleTypeChange(type as ResourceType)}
                className={cn(
                  "relative p-6 rounded-xl border-2 text-left transition-all duration-200",
                  "hover:shadow-lg hover:scale-[1.02]",
                  isSelected
                    ? "border-primary bg-primary/10 shadow-md"
                    : "border-border hover:border-primary/50"
                )}
              >
                {isSelected && (
                  <Badge className="absolute top-2 right-2" variant="default">
                    已选择
                  </Badge>
                )}
                <div className={cn("mb-3", meta.color)}>
                  <Icon className="w-10 h-10" />
                </div>
                <div className="font-semibold text-lg mb-1">{meta.label}</div>
                <div className="text-sm text-muted-foreground">
                  {meta.description}
                </div>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* 基本信息 */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold">基本信息</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">资源名称</Label>
                  <Input
                    id="name"
                    value={commonFields.name}
                    onChange={(e) =>
                      setCommonFields((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="输入资源名称"
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">资源描述</Label>
                  <Textarea
                    id="description"
                    value={commonFields.description}
                    onChange={(e) =>
                      setCommonFields((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="描述这个资源的用途和功能"
                    className="min-h-[100px]"
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive mt-1">{errors.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="version">版本号</Label>
                    <Input
                      id="version"
                      value={commonFields.version}
                      onChange={(e) =>
                        setCommonFields((prev) => ({ ...prev, version: e.target.value }))
                      }
                      placeholder="1.0.0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tags">标签（逗号分隔）</Label>
                    <Input
                      id="tags"
                      value={commonFields.tags}
                      onChange={(e) =>
                        setCommonFields((prev) => ({ ...prev, tags: e.target.value }))
                      }
                      placeholder="自动化，效率，AI"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 类型专属配置 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    {React.createElement(resourceTypeMeta[selectedType].icon, {
                      className: "w-5 h-5",
                    })}
                    {resourceTypeMeta[selectedType].label}
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!advancedMode && !jsonContent) {
                        // 切换到高级模式时，如果 jsonContent 为空，用当前表单数据初始化
                        setJsonContent(getJsonPreview());
                      }
                      setAdvancedMode(!advancedMode);
                    }}
                  >
                    {advancedMode ? (
                      <>
                        <Edit3 className="w-4 h-4 mr-2" />
                        结构化模式
                      </>
                    ) : (
                      <>
                        <Code className="w-4 h-4 mr-2" />
                        高级模式
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {advancedMode ? (
                  /* 高级模式 - JSON 编辑 */
                  <div>
                    <Textarea
                      value={jsonContent}
                      onChange={(e) => setJsonContent(e.target.value)}
                      placeholder="输入 JSON 格式的配置内容"
                      className="min-h-[300px] font-mono text-sm"
                    />
                    {jsonContent && (
                      <>
                        <p className="text-sm text-muted-foreground mt-2">
                          预览：
                        </p>
                        <pre className="bg-secondary/50 rounded-md p-4 overflow-x-auto text-sm font-mono max-h-[200px] mt-2">
                          <code>{jsonContent}</code>
                        </pre>
                      </>
                    )}
                  </div>
                ) : (
                  /* 结构化模式 - 类型专属表单 */
                  <div className="space-y-6">
                    {/* MCP 表单 */}
                    {selectedType === ResourceTypeEnum.MCP && (
                      <>
                        <div>
                          <Label htmlFor="mcp-command">命令</Label>
                          <Input
                            id="mcp-command"
                            value={mcpFields.command}
                            onChange={(e) =>
                              setMcpFields((prev) => ({
                                ...prev,
                                command: e.target.value,
                              }))
                            }
                            placeholder="npx @anthropic/mcp-server"
                          />
                          {errors.command && (
                            <p className="text-sm text-destructive mt-1">
                              {errors.command}
                            </p>
                          )}
                        </div>

                        {/* 参数列表 */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>参数列表</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addMcpArg}
                            >
                              <Plus className="w-4 h-4 mr-1" /> 添加参数
                            </Button>
                          </div>
                          {mcpFields.args.map((arg, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                              <Input
                                value={arg}
                                onChange={(e) => updateMcpArg(index, e.target.value)}
                                placeholder={`参数 ${index + 1}`}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeMcpArg(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        {/* 环境变量表 */}
                        <div>
                          <Label className="mb-2 block">环境变量</Label>
                          <div className="space-y-2 mb-4">
                            {mcpFields.envVars.map((env) => (
                              <div
                                key={env.key}
                                className="flex items-center gap-2 p-2 rounded-md bg-secondary/50"
                              >
                                <code className="flex-1 text-sm">{env.key}</code>
                                <span className="text-sm text-muted-foreground">
                                  {env.value || "(空)"}
                                </span>
                                {env.required && (
                                  <Badge variant="outline" className="text-xs">
                                    必填
                                  </Badge>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeMcpEnv(env.key)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-12 gap-2">
                            <Input
                              className="col-span-3"
                              value={mcpFields.envKey}
                              onChange={(e) =>
                                setMcpFields((prev) => ({
                                  ...prev,
                                  envKey: e.target.value,
                                }))
                              }
                              placeholder="键"
                            />
                            <Input
                              className="col-span-3"
                              value={mcpFields.envValue}
                              onChange={(e) =>
                                setMcpFields((prev) => ({
                                  ...prev,
                                  envValue: e.target.value,
                                }))
                              }
                              placeholder="值"
                            />
                            <Input
                              className="col-span-4"
                              value={mcpFields.envDescription}
                              onChange={(e) =>
                                setMcpFields((prev) => ({
                                  ...prev,
                                  envDescription: e.target.value,
                                }))
                              }
                              placeholder="描述"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addMcpEnv}
                              className="col-span-2"
                            >
                              添加
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="mcp-install">安装命令</Label>
                          <Input
                            id="mcp-install"
                            value={mcpFields.installCommand}
                            onChange={(e) =>
                              setMcpFields((prev) => ({
                                ...prev,
                                installCommand: e.target.value,
                              }))
                            }
                            placeholder="npm install -g @spectrai/mcp-server"
                          />
                        </div>
                      </>
                    )}

                    {/* Workflow 表单 */}
                    {selectedType === ResourceTypeEnum.WORKFLOW && (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>步骤列表</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addWorkflowStep}
                            >
                              <Plus className="w-4 h-4 mr-1" /> 添加步骤
                            </Button>
                          </div>
                          {errors.steps && (
                            <p className="text-sm text-destructive mb-2">
                              {errors.steps}
                            </p>
                          )}
                          <div className="space-y-2 mb-4">
                            {workflowFields.steps.map((step, index) => (
                              <div
                                key={step.id}
                                className="flex items-center gap-2 p-3 rounded-md bg-secondary/50"
                              >
                                <span className="text-muted-foreground text-sm">
                                  #{index + 1}
                                </span>
                                <div className="flex-1">
                                  <div className="font-medium">{step.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    类型: {step.type}
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => moveWorkflowStep(step.id, "up")}
                                  disabled={index === 0}
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => moveWorkflowStep(step.id, "down")}
                                  disabled={index === workflowFields.steps.length - 1}
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeWorkflowStep(step.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-12 gap-2">
                            <Input
                              className="col-span-4"
                              value={workflowFields.newStepName}
                              onChange={(e) =>
                                setWorkflowFields((prev) => ({
                                  ...prev,
                                  newStepName: e.target.value,
                                }))
                              }
                              placeholder="步骤名称"
                            />
                            <Input
                              className="col-span-3"
                              value={workflowFields.newStepType}
                              onChange={(e) =>
                                setWorkflowFields((prev) => ({
                                  ...prev,
                                  newStepType: e.target.value,
                                }))
                              }
                              placeholder="类型"
                            />
                            <Input
                              className="col-span-3"
                              value={workflowFields.newStepConfig}
                              onChange={(e) =>
                                setWorkflowFields((prev) => ({
                                  ...prev,
                                  newStepConfig: e.target.value,
                                }))
                              }
                              placeholder='{"key": "value"}'
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addWorkflowStep}
                              className="col-span-2"
                            >
                              添加
                            </Button>
                          </div>
                          {errors.newStepConfig && (
                            <p className="text-sm text-destructive mt-1">
                              {errors.newStepConfig}
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    {/* Skill 表单 */}
                    {selectedType === ResourceTypeEnum.SKILL && (
                      <>
                        <div>
                          <Label htmlFor="skill-command">触发命令</Label>
                          <Input
                            id="skill-command"
                            value={skillFields.command}
                            onChange={(e) =>
                              setSkillFields((prev) => ({
                                ...prev,
                                command: e.target.value,
                              }))
                            }
                            placeholder="翻译 (会自动添加 / 前缀)"
                          />
                          <p className="text-sm text-muted-foreground mt-1">
                            触发命令将自动添加 / 前缀
                          </p>
                          {errors.command && (
                            <p className="text-sm text-destructive mt-1">
                              {errors.command}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="skill-prompt">提示词模板</Label>
                          <Textarea
                            id="skill-prompt"
                            value={skillFields.promptTemplate}
                            onChange={(e) =>
                              setSkillFields((prev) => ({
                                ...prev,
                                promptTemplate: e.target.value,
                              }))
                            }
                            placeholder="请输入提示词模板，支持 &#123;&#123;input&#125;&#125; 占位符"
                            className="min-h-[200px] font-mono"
                          />
                          <p className="text-sm text-muted-foreground mt-1">
                            使用 &#123;&#123;input&#125;&#125; 表示用户输入内容
                          </p>
                          {errors.promptTemplate && (
                            <p className="text-sm text-destructive mt-1">
                              {errors.promptTemplate}
                            </p>
                          )}
                        </div>

                        {/* 变量列表 */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>变量列表</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addSkillVariable}
                            >
                              <Plus className="w-4 h-4 mr-1" /> 添加变量
                            </Button>
                          </div>
                          <div className="space-y-2 mb-4">
                            {skillFields.variables.map((v) => (
                              <div
                                key={v.name}
                                className="flex items-center gap-2 p-2 rounded-md bg-secondary/50"
                              >
                                <code className="text-sm">{v.name}</code>
                                <span className="text-muted-foreground">:</span>
                                <Badge variant="outline" className="text-xs">
                                  {v.type}
                                </Badge>
                                {v.defaultValue && (
                                  <span className="text-sm text-muted-foreground">
                                    = {v.defaultValue}
                                  </span>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="ml-auto"
                                  onClick={() => removeSkillVariable(v.name)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-12 gap-2">
                            <Input
                              className="col-span-3"
                              value={skillFields.newVarName}
                              onChange={(e) =>
                                setSkillFields((prev) => ({
                                  ...prev,
                                  newVarName: e.target.value,
                                }))
                              }
                              placeholder="变量名"
                            />
                            <Input
                              className="col-span-3"
                              value={skillFields.newVarType}
                              onChange={(e) =>
                                setSkillFields((prev) => ({
                                  ...prev,
                                  newVarType: e.target.value,
                                }))
                              }
                              placeholder="类型"
                            />
                            <Input
                              className="col-span-4"
                              value={skillFields.newVarDefault}
                              onChange={(e) =>
                                setSkillFields((prev) => ({
                                  ...prev,
                                  newVarDefault: e.target.value,
                                }))
                              }
                              placeholder="默认值（可选）"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addSkillVariable}
                              className="col-span-2"
                            >
                              添加
                            </Button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Team 表单 */}
                    {selectedType === ResourceTypeEnum.TEAM && (
                      <>
                        {errors.roles && (
                          <p className="text-sm text-destructive mb-2">
                            {errors.roles}
                          </p>
                        )}
                        <div className="space-y-4">
                          {teamFields.roles.map((role) => (
                            <div
                              key={role.id}
                              className="p-4 rounded-lg border bg-secondary/30"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <div className="font-medium">{role.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {role.description}
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeTeamRole(role.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">
                                    Provider:{" "}
                                  </span>
                                  <Badge variant="outline">{role.provider}</Badge>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">
                                    System Prompt:{" "}
                                  </span>
                                  <p className="mt-1 text-xs bg-background p-2 rounded border">
                                    {role.systemPrompt || "(未设置)"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* 添加角色表单 */}
                        <div className="p-4 rounded-lg border border-dashed">
                          <h4 className="font-medium mb-4">添加角色</h4>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="role-name">角色名称</Label>
                                <Input
                                  id="role-name"
                                  value={teamFields.newRoleName}
                                  onChange={(e) =>
                                    setTeamFields((prev) => ({
                                      ...prev,
                                      newRoleName: e.target.value,
                                    }))
                                  }
                                  placeholder="例如：助手"
                                />
                              </div>
                              <div>
                                <Label htmlFor="role-desc">角色描述</Label>
                                <Input
                                  id="role-desc"
                                  value={teamFields.newRoleDescription}
                                  onChange={(e) =>
                                    setTeamFields((prev) => ({
                                      ...prev,
                                      newRoleDescription: e.target.value,
                                    }))
                                  }
                                  placeholder="描述角色职责"
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="role-provider">Provider</Label>
                              <select
                                id="role-provider"
                                value={teamFields.newRoleProvider}
                                onChange={(e) =>
                                  setTeamFields((prev) => ({
                                    ...prev,
                                    newRoleProvider: e.target.value,
                                  }))
                                }
                                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                              >
                                <option value="claude">Claude</option>
                                <option value="gpt4">GPT-4</option>
                                <option value="gemini">Gemini</option>
                                <option value="local">Local</option>
                              </select>
                            </div>
                            <div>
                              <Label htmlFor="role-prompt">System Prompt</Label>
                              <Textarea
                                id="role-prompt"
                                value={teamFields.newRoleSystemPrompt}
                                onChange={(e) =>
                                  setTeamFields((prev) => ({
                                    ...prev,
                                    newRoleSystemPrompt: e.target.value,
                                  }))
                                }
                                placeholder="设置角色的系统提示词"
                                className="min-h-[100px]"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={addTeamRole}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              添加角色
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* JSON 预览（结构化模式下显示） */}
            {!advancedMode && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    <h3 className="font-semibold">JSON 预览</h3>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="bg-secondary/50 rounded-md p-4 overflow-x-auto text-sm font-mono max-h-[300px] overflow-y-auto">
                    <code>{getJsonPreview()}</code>
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* 提交错误 */}
            {errors.submit && (
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                {errors.submit}
              </div>
            )}

            {/* 提交按钮 */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                取消
              </Button>
              <Button type="submit" variant="gradient" disabled={isSubmitting}>
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? "发布中..." : "发布资源"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
