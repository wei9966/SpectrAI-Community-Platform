"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Code, Eye, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { ResourceType, CreateResourceInput } from "@spectrai-community/shared";
import { ResourceType as ResourceTypeEnum } from "@spectrai-community/shared";

const resourceTypes: Array<{ value: ResourceType; label: string; description: string }> = [
  { value: ResourceTypeEnum.WORKFLOW, label: "工作流", description: "自动化任务编排配置" },
  { value: ResourceTypeEnum.TEAM, label: "团队配置", description: "多角色协作配置" },
  { value: ResourceTypeEnum.SKILL, label: "技能", description: "AI 能力扩展技能" },
  { value: ResourceTypeEnum.MCP, label: "MCP 服务", description: "外部工具集成服务" },
];

export default function PublishPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = React.useState<ResourceType>(ResourceTypeEnum.WORKFLOW);
  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
    version: "1.0.0",
    tags: "",
    content: "",
  });
  const [preview, setPreview] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "请输入资源名称";
    }
    if (!formData.description.trim()) {
      newErrors.description = "请输入资源描述";
    }
    if (!formData.content.trim()) {
      newErrors.content = "请输入资源配置内容";
    } else {
      try {
        JSON.parse(formData.content);
      } catch {
        newErrors.content = "配置内容必须是有效的 JSON 格式";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const createData: CreateResourceInput = {
        name: formData.name,
        description: formData.description,
        type: selectedType,
        content: JSON.parse(formData.content),
        tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
        version: formData.version,
      };

      const result = await api.createResource(createData);

      if (result.success) {
        // 发布成功，跳转到资源详情页
        router.push(`/resource/${result.data?.id}`);
      } else {
        setErrors({ submit: result.error || "发布失败" });
      }
    } catch (error) {
      setErrors({ submit: "发布失败，请稍后重试" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const getJsonPreview = () => {
    try {
      const content = JSON.parse(formData.content);
      const preview: CreateResourceInput = {
        name: formData.name,
        description: formData.description,
        type: selectedType,
        content,
        tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
        version: formData.version,
      };
      return JSON.stringify(preview, null, 2);
    } catch {
      return JSON.stringify({ error: "无效的 JSON 格式" }, null, 2);
    }
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

        {/* 资源类型选择 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {resourceTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              className={`p-4 rounded-lg border text-left transition-all ${
                selectedType === type.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="font-semibold mb-1">{type.label}</div>
              <div className="text-xs text-muted-foreground">{type.description}</div>
            </button>
          ))}
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
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
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
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
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
                      name="version"
                      value={formData.version}
                      onChange={handleInputChange}
                      placeholder="1.0.0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tags">标签（逗号分隔）</Label>
                    <Input
                      id="tags"
                      name="tags"
                      value={formData.tags}
                      onChange={handleInputChange}
                      placeholder="自动化，效率，AI"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 配置内容 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Code className="w-5 h-5" />
                    配置内容（JSON 格式）
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreview(!preview)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {preview ? "编辑" : "预览"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {preview ? (
                  <pre className="bg-secondary/50 rounded-md p-4 overflow-x-auto text-sm font-mono max-h-[400px] overflow-y-auto">
                    <code>{getJsonPreview()}</code>
                  </pre>
                ) : (
                  <Textarea
                    id="content"
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    placeholder={`{
  "name": "${formData.name || "资源名称"}",
  "description": "${formData.description || "资源描述"}",
  "version": "${formData.version || "1.0.0"}"
  ...
}`}
                    className="min-h-[300px] font-mono text-sm"
                  />
                )}
                {errors.content && (
                  <p className="text-sm text-destructive mt-1">{errors.content}</p>
                )}
              </CardContent>
            </Card>

            {/* 提交错误 */}
            {errors.submit && (
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                {errors.submit}
              </div>
            )}

            {/* 提交按钮 */}
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
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
