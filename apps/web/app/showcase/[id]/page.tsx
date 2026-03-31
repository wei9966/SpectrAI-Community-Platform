'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Github, Heart, Calendar, Eye, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResourceCard } from '@/components/ResourceCard';
import { mockResources } from '@/lib/mock-data';
import type { PublicResource } from '@spectrai-community/shared';

// 项目类型
interface ShowcaseProject {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
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
  createdAt: Date;
  updatedAt: Date;
  resources?: PublicResource[];
}

// Mock 数据
const mockProject: ShowcaseProject = {
  id: 'p1',
  title: 'AI 代码审查助手',
  description: `基于 GPT-4 的自动化代码审查工具，支持检测安全漏洞、性能问题和代码规范违规。

## 功能特点

- **自动化审查**：无需人工干预，自动扫描代码库中的问题
- **多语言支持**：支持 Python、JavaScript、TypeScript、Go、Java 等主流语言
- **安全检测**：内置 OWASP Top 10 安全漏洞检测规则
- **GitHub 集成**：无缝集成到 GitHub Actions，支持 PR 自动评论
- **详细报告**：生成可读性高的审查报告，包含问题定位和修复建议

## 技术架构

- 前端：Next.js 15 + React 19
- 后端：Node.js + Express
- AI：OpenAI GPT-4 API
- 部署：Vercel + Railway`,
  coverImageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=600&fit=crop',
  demoUrl: 'https://demo.example.com/code-review',
  sourceUrl: 'https://github.com/example/code-review',
  author: {
    id: 'u1',
    username: 'DevMaster',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DevMaster',
  },
  tags: ['GPT-4', '代码审查', 'GitHub Actions', '安全检测', '自动化'],
  likes: 328,
  views: 4521,
  createdAt: new Date('2025-03-20T10:00:00Z'),
  updatedAt: new Date('2025-03-28T15:30:00Z'),
  resources: mockResources.slice(0, 2),
};

export default function ShowcaseDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [project, setProject] = React.useState(mockProject);
  const [isLiked, setIsLiked] = React.useState(false);
  const [localLikes, setLocalLikes] = React.useState(mockProject.likes);

  const timeAgo = (date: Date) => {
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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLocalLikes(isLiked ? localLikes - 1 : localLikes + 1);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({
        title: project.title,
        text: project.description ?? undefined,
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      // TODO: 显示 toast 提示
    }
  };

  if (!project) {
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
                href={`/user/${project.author.username}`}
                className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                {project.author.avatarUrl ? (
                  <img
                    src={project.author.avatarUrl}
                    alt={project.author.username}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
                    <span className="text-white text-lg font-bold">
                      {project.author.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium">{project.author.username}</p>
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
