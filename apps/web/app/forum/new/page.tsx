'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MarkdownEditor } from '@/components/markdown-editor';
import { cn } from '@/lib/utils';

interface FormData {
  title: string;
  content: string;
  categoryId: string;
  tags: string[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function NewPostPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [formData, setFormData] = React.useState<FormData>({
    title: '',
    content: '',
    categoryId: '',
    tags: [],
  });
  const [tagInput, setTagInput] = React.useState('');
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormData, string>>>({});

  React.useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setIsAuthenticated(false);
      return;
    }
    setIsAuthenticated(true);

    fetch(`${API_BASE}/api/forum/categories`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setCategories(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = '请输入帖子标题';
    } else if (formData.title.length > 200) {
      newErrors.title = '标题不能超过 200 个字符';
    }

    if (!formData.content.trim()) {
      newErrors.content = '请输入帖子内容';
    } else if (formData.content.length < 10) {
      newErrors.content = '内容至少需要 10 个字符';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = '请选择板块';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 5) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/api/forum/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          categoryId: formData.categoryId,
          tags: formData.tags.length > 0 ? formData.tags : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/forum/post/${data.data.id}`);
      } else {
        setErrors({ title: data.error || '提交失败，请重试' });
      }
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
          您需要登录后才能发布帖子
        </p>
        <Link href="/login">
          <Button variant="gradient">前往登录</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12 max-w-4xl">
      {/* 返回按钮 */}
      <Link
        href="/forum"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回论坛
      </Link>

      <h1 className="text-3xl font-bold mb-8">发布帖子</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 标题和板块 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 板块选择 */}
            <div className="space-y-2">
              <Label>
                选择板块 <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, categoryId: category.id })}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-all',
                      formData.categoryId === category.id
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <span className="font-medium text-sm">{category.name}</span>
                  </button>
                ))}
              </div>
              {errors.categoryId && (
                <p className="text-xs text-destructive">{errors.categoryId}</p>
              )}
            </div>

            {/* 标题 */}
            <div className="space-y-2">
              <Label htmlFor="title">
                帖子标题 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="请输入帖子标题，简洁明了"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                maxLength={200}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                {errors.title && (
                  <span className="text-destructive">{errors.title}</span>
                )}
                <span className="ml-auto">{formData.title.length}/200</span>
              </div>
            </div>

            {/* 标签 */}
            <div className="space-y-2">
              <Label>标签（可选，最多 5 个）</Label>
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
                  disabled={formData.tags.length >= 5}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || formData.tags.length >= 5}
                >
                  添加
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 内容 */}
        <Card>
          <CardHeader>
            <CardTitle>帖子内容</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>
                正文 <span className="text-destructive">*</span>
              </Label>
              <div className="min-h-[400px]">
                <MarkdownEditor
                  value={formData.content}
                  onChange={(value) => setFormData({ ...formData, content: value })}
                  placeholder="输入帖子内容，支持 Markdown 格式..."
                  className="h-full"
                />
              </div>
              {errors.content && (
                <p className="text-xs text-destructive">{errors.content}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 提示 */}
        <Card className="bg-secondary/30">
          <CardContent className="py-4">
            <h4 className="font-medium mb-2">发帖须知</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 请选择合适的板块发布帖子</li>
              <li>• 标题要简洁明了，能准确描述问题或主题</li>
              <li>• 内容要详细描述问题或想法，便于他人理解和帮助</li>
              <li>• 使用 Markdown 格式可以让内容更易读</li>
              <li>• 严禁发布广告、垃圾信息或违规内容</li>
            </ul>
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
                发布中...
              </>
            ) : (
              '发布帖子'
            )}
          </Button>
          <Link href="/forum">
            <Button type="button" variant="outline" size="lg">
              取消
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
