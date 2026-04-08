'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Github, Heart, Calendar, Eye, Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResourceCard } from '@/components/ResourceCard';
import type { PublicResource } from '@spectrai-community/shared';

import { API_BASE } from '@/lib/api-base';

// 项目类型
interface ShowcaseProject {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  coverImage?: string | null;
  demoUrl: string | null;
  sourceUrl: string | null;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  tags: string[];
  likes: number;
  views: number;
  createdAt: string;
  updatedAt: string;
  resources?: PublicResource[];
}

export default function ShowcaseDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [project, setProject] = React.useState<ShowcaseProject | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [isLiked, setIsLiked] = React.useState(false);
  const [localLikes, setLocalLikes] = React.useState(0);

  // 防御式获取 author，避免 author 为 null/undefined 时崩溃
  const getAuthorUsername = () => project?.author?.username || '未知用户';
  const getAuthorAvatar = () => project?.author?.avatarUrl || null;
  const getAuthorId = () => project?.author?.id || null;

  React.useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(false);

    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`${API_BASE}/api/projects/${id}`, { headers })
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        if (data.success && data.data) {
          const p = data.data;
          // 兼容后端字段名差异（coverImage vs coverImageUrl）
          const normalized: ShowcaseProject = {
            ...p,
            coverImageUrl: p.coverImageUrl || p.coverImage || null,
            tags: p.tags || [],
            likes: p.likes ?? 0,
            views: p.views ?? p.viewCount ?? 0,
            resources: p.resources || [],
          };
          setProject(normalized);
          setLocalLikes(normalized.likes);
        } else {
          setError(true);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch project:', err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const timeAgo = (date: string | Date) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    const intervals: Record<string, number> = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval}${unit === 'year' ? '年' : unit === 'month' ? '个月' : unit === 'week' ? '周' : unit === 'day' ? '天' : unit === 'hour' ? '小时' : '分钟'}前`;
      }
    }
    return '刚刚';
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleLike = async () => {
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLocalLikes(newIsLiked ? localLikes + 1 : localLikes - 1);

    // 尝试调用后端 API 持久化点赞状态
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch(`${API_BASE}/api/projects/${id}/like`, {
          method: newIsLiked ? 'POST' : 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch {
      // API 暂不可用时静默降级，保持本地状态
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: project?.title ?? '',
          text: project?.description ?? undefined,
          url,
        });
        return;
      }

      // clipboard API 在 HTTPS 下可用
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // HTTP 环境 fallback：使用临时 textarea 复制
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch {
      // 分享/复制失败时静默处理
    }
  };

  if (loading) {
    return (
      <div className="container py-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">项目不存在</h1>
        <p className="text-muted-foreground mb-8">
          该项目可能已被删除或移动
        </p>
        <Link href="/showcase">
          <Button>返回 Showcase</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12">
      {/* 返回按钮 */}
      <Link
        href="/showcase"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回 Showcase
      </Link>

      {/* 封面图 */}
      {project.coverImageUrl && (
        <div className="rounded-xl overflow-hidden mb-8">
          <img
            src={project.coverImageUrl}
            alt={project.title}
            className="w-full max-h-[400px] object-cover"
          />
        </div>
      )}

      {/* 主内容 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧：项目信息 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 标题和操作 */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">{project.title}</h1>
              {/* 标签 */}
              <div className="flex flex-wrap gap-2 mb-3">
                {project.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isLiked ? 'default' : 'outline'}
                onClick={handleLike}
              >
                <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                {localLikes}
              </Button>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* 描述 */}
          <Card>
            <CardHeader>
              <CardTitle>项目介绍</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-invert max-w-none">
                {(project.description || '').split('\n').map((line, i) => {
                  if (line.startsWith('## ')) {
                    return (
                      <h2 key={i} className="text-xl font-semibold mt-6 mb-3">
                        {line.replace('## ', '')}
                      </h2>
                    );
                  }
                  if (line.startsWith('- **')) {
                    const match = line.match(/- \*\*(.+?)\*\*：?(.+)/);
                    if (match) {
                      return (
                        <p key={i} className="mb-2">
                          <strong>{match[1]}：</strong>
                          {match[2]}
                        </p>
                      );
                    }
                  }
                  if (line.startsWith('- ')) {
                    return (
                      <li key={i} className="ml-4 mb-1">
                        {line.replace('- ', '')}
                      </li>
                    );
                  }
                  if (line.trim() === '') {
                    return <br key={i} />;
                  }
                  return (
                    <p key={i} className="text-muted-foreground mb-2">
                      {line}
                    </p>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 关联资源 */}
          {project.resources && project.resources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>使用的资源</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {project.resources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} showRating={false} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧：作者和统计 */}
        <div className="space-y-6">
          {/* 作者信息 */}
          <Card>
            <CardHeader>
              <CardTitle>作者</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/user/${getAuthorUsername()}`}
                className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                {getAuthorAvatar() ? (
                  <img
                    src={getAuthorAvatar()!}
                    alt={getAuthorUsername()}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
                    <span className="text-white text-lg font-bold">
                      {getAuthorUsername().charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium">{getAuthorUsername()}</p>
                  <p className="text-xs text-muted-foreground">点击查看主页</p>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* 项目链接 */}
          <Card>
            <CardHeader>
              <CardTitle>项目链接</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {project.demoUrl ? (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <ExternalLink className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">在线演示</p>
                    <p className="text-xs text-muted-foreground truncate">{project.demoUrl}</p>
                  </div>
                </a>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/20 text-muted-foreground">
                  <ExternalLink className="w-5 h-5" />
                  <span className="text-sm">暂无演示</span>
                </div>
              )}
              {project.sourceUrl ? (
                <a
                  href={project.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <Github className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">源代码</p>
                    <p className="text-xs text-muted-foreground truncate">{project.sourceUrl}</p>
                  </div>
                </a>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/20 text-muted-foreground">
                  <Github className="w-5 h-5" />
                  <span className="text-sm">暂不开源</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 统计数据 */}
          <Card>
            <CardHeader>
              <CardTitle>统计数据</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Heart className="w-4 h-4" />
                  <span className="text-sm">获赞</span>
                </div>
                <span className="font-medium">{localLikes}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">浏览</span>
                </div>
                <span className="font-medium">{project.views.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">发布时间</span>
                </div>
                <span className="font-medium">{formatDate(project.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
