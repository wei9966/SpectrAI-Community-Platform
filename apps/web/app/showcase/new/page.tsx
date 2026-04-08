'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUpload } from '@/components/image-upload';
import { Badge } from '@/components/ui/badge';
import type { PublicResource } from '@spectrai-community/shared';

import { API_BASE } from '@/lib/api-base';

interface FormData {
  title: string;
  description: string;
  coverImageUrl: string | null;
  demoUrl: string;
  sourceUrl: string;
  tags: string[];
  resourceIds: string[];
}

export default function NewShowcasePage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState<FormData>({
    title: '',
    description: '',
    coverImageUrl: null,
    demoUrl: '',
    sourceUrl: '',
    tags: [],
    resourceIds: [],
  });
  const [tagInput, setTagInput] = React.useState('');
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormData, string>>>({});
  const [availableResources, setAvailableResources] = React.useState<PublicResource[]>([]);
  const [resourcesLoading, setResourcesLoading] = React.useState(true);

  // 检查认证状态
  React.useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setIsAuthenticated(false);
    } else {
      setIsAuthenticated(true);
    }
  }, []);

  // 从 API 获取可关联的资源列表
  React.useEffect(() => {
    async function fetchResources() {
      try {
        const res = await fetch(`${API_BASE}/api/resources?limit=100`);
        if (res.ok) {
          const json = await res.json();
          setAvailableResources(json.data?.items || []);
        }
      } catch (err) {
        console.error('Failed to fetch resources:', err);
      } finally {
        setResourcesLoading(false);
      }
    }
    fetchResources();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = '请输入项目标题';
    } else if (formData.title.length > 200) {
      newErrors.title = '标题不能超过 200 个字符';
    }

    if (formData.description.length > 2000) {
      newErrors.description = '描述不能超过 2000 个字符';
    }

    if (formData.demoUrl && !isValidUrl(formData.demoUrl)) {
      newErrors.demoUrl = '请输入有效的 Demo URL';
    }

    if (formData.sourceUrl && !isValidUrl(formData.sourceUrl)) {
      newErrors.sourceUrl = '请输入有效的源码 URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tagToRemove),
    });
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleResourceToggle = (resourceId: string) => {
    setFormData((prev) => ({
      ...prev,
      resourceIds: prev.resourceIds.includes(resourceId)
        ? prev.resourceIds.filter((id) => id !== resourceId)
        : [...prev.resourceIds, resourceId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/projects`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || undefined,
          coverImage: formData.coverImageUrl || undefined,
          demoUrl: formData.demoUrl || undefined,
          sourceUrl: formData.sourceUrl || undefined,
          tags: formData.tags.length > 0 ? formData.tags : undefined,
          status: 'published',
        }),
      });

      if (!res.ok) throw new Error('Failed to create project');

      const json = await res.json();
      const projectId = json.data?.id;

      // 关联选中的资源
      if (projectId && formData.resourceIds.length > 0) {
        await Promise.allSettled(
          formData.resourceIds.map((resourceId) =>
            fetch(`${API_BASE}/api/projects/${projectId}/resources`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ resourceId }),
            })
          )
        );
      }

      router.push('/showcase');
    } catch (error) {
      console.error('Failed to submit:', error);
      setErrors({ title: '提交失败，请重试' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">请先登录</h1>
        <p className="text-muted-foreground mb-8">
          您需要登录后才能提交项目
        </p>
        <Link href="/login">
          <Button variant="gradient">前往登录</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12 max-w-3xl">
      {/* 返回按钮 */}
      <Link
        href="/showcase"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回 Showcase
      </Link>

      <h1 className="text-3xl font-bold mb-8">提交项目</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 标题 */}
            <div className="space-y-2">
              <Label htmlFor="title">
                项目标题 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="请输入项目名称"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                maxLength={200}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                {errors.title && (
                  <span className="text-destructive">{errors.title}</span>
                )}
                <span className="ml-auto">{formData.title.length}/200</span>
              </div>
            </div>

            {/* 描述 */}
            <div className="space-y-2">
              <Label htmlFor="description">项目描述</Label>
              <textarea
                id="description"
                placeholder="详细介绍您的项目功能、特点和使用方法..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                maxLength={2000}
              />
              <div className="flex justify-end text-xs text-muted-foreground">
                {formData.description.length}/2000
              </div>
            </div>

            {/* 封面图片 */}
            <div className="space-y-2">
              <Label>封面图片</Label>
              <ImageUpload
                value={formData.coverImageUrl}
                onChange={(url) =>
                  setFormData({ ...formData, coverImageUrl: url })
                }
                accept="image/*"
                maxSize={5}
              />
              <p className="text-xs text-muted-foreground">
                建议尺寸 800x400，支持 JPG、PNG、WebP 格式，最大 5MB
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 链接信息 */}
        <Card>
          <CardHeader>
            <CardTitle>链接信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Demo URL */}
            <div className="space-y-2">
              <Label htmlFor="demoUrl">Demo 链接</Label>
              <Input
                id="demoUrl"
                type="url"
                placeholder="https://your-demo-url.com"
                value={formData.demoUrl}
                onChange={(e) =>
                  setFormData({ ...formData, demoUrl: e.target.value })
                }
              />
              {errors.demoUrl && (
                <p className="text-xs text-destructive">{errors.demoUrl}</p>
              )}
            </div>

            {/* Source URL */}
            <div className="space-y-2">
              <Label htmlFor="sourceUrl">源码链接</Label>
              <Input
                id="sourceUrl"
                type="url"
                placeholder="https://github.com/your-project"
                value={formData.sourceUrl}
                onChange={(e) =>
                  setFormData({ ...formData, sourceUrl: e.target.value })
                }
              />
              {errors.sourceUrl && (
                <p className="text-xs text-destructive">{errors.sourceUrl}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 标签 */}
        <Card>
          <CardHeader>
            <CardTitle>标签</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="输入标签后按回车添加"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                maxLength={20}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                disabled={!tagInput.trim() || formData.tags.length >= 10}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              最多添加 10 个标签，每个标签不超过 20 个字符
            </p>
          </CardContent>
        </Card>

        {/* 关联资源 */}
        <Card>
          <CardHeader>
            <CardTitle>关联资源</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              选择与该项目关联的 SpectrAI 资源（可选）
            </p>
            <div className="space-y-3">
              {resourcesLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  加载资源列表...
                </div>
              ) : availableResources.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">暂无可关联的资源</p>
              ) : null}
              {availableResources.map((resource) => {
                const isSelected = formData.resourceIds.includes(resource.id);
                return (
                  <div
                    key={resource.id}
                    onClick={() => handleResourceToggle(resource.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center ${
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground'
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{resource.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {resource.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 提交按钮 */}
        <div className="flex items-center gap-4 pt-4">
          <Button
            type="submit"
            variant="gradient"
            size="lg"
            disabled={isSubmitting}
            className="min-w-[200px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                提交中...
              </>
            ) : (
              '提交项目'
            )}
          </Button>
          <Link href="/showcase">
            <Button type="button" variant="outline" size="lg">
              取消
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
