'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus, Flame, Clock, ExternalLink, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { API_BASE } from '@/lib/api-base';

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
  createdAt: string;
  updatedAt: string;
}

type SortOption = 'latest' | 'popular';

export default function ShowcasePage() {
  const [projects, setProjects] = React.useState<ShowcaseProject[]>([]);
  const [sortBy, setSortBy] = React.useState<SortOption>('latest');
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsAuthenticated(!!token);
  }, []);

  React.useEffect(() => {
    setLoading(true);
    setError(false);

    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`${API_BASE}/api/projects?sort=${sortBy}`, { headers })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProjects(data.data?.items || (Array.isArray(data.data) ? data.data : []));
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [sortBy]);

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

  return (
    <div className="container py-8 md:py-12">
      {/* 头部 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Showcase</h1>
          <p className="text-muted-foreground">
            发现精彩的 AI 应用和项目展示
          </p>
        </div>
        {isAuthenticated && (
          <Link href="/showcase/new">
            <Button variant="gradient">
              <Plus className="w-4 h-4 mr-2" />
              提交项目
            </Button>
          </Link>
        )}
      </div>

      {/* 筛选/排序栏 */}
      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border">
        <span className="text-sm text-muted-foreground">排序：</span>
        <div className="flex items-center gap-2">
          <Button
            variant={sortBy === 'latest' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSortBy('latest')}
          >
            <Clock className="w-4 h-4 mr-1.5" />
            最新
          </Button>
          <Button
            variant={sortBy === 'popular' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSortBy('popular')}
          >
            <Flame className="w-4 h-4 mr-1.5" />
            最热
          </Button>
        </div>
        <span className="text-sm text-muted-foreground ml-auto">
          共 {projects.length} 个项目
        </span>
      </div>

      {/* 项目网格 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <div className="aspect-video bg-muted" />
              <CardHeader className="pb-2">
                <div className="h-5 bg-muted rounded w-2/3 mb-2" />
                <div className="flex gap-1.5">
                  <div className="h-5 bg-muted rounded w-14" />
                  <div className="h-5 bg-muted rounded w-14" />
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="h-4 bg-muted rounded w-full mb-1" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </CardContent>
              <CardFooter className="pt-2 border-t border-border/40">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-muted rounded-full" />
                  <div className="h-3 bg-muted rounded w-16" />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 text-muted-foreground">
          数据加载失败，请刷新页面重试
        </div>
      ) : projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} timeAgo={timeAgo} />
          ))}
        </div>
      ) : (
        <Card className="py-16">
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">暂无项目</p>
            {isAuthenticated && (
              <Link href="/showcase/new">
                <Button variant="outline">成为第一个提交者</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface ProjectCardProps {
  project: ShowcaseProject;
  timeAgo: (date: string | Date) => string;
}

function ProjectCard({ project, timeAgo }: ProjectCardProps) {
  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300">
      {/* 封面图 */}
      <Link href={`/showcase/${project.id}`}>
        {project.coverImageUrl ? (
          <div className="aspect-video overflow-hidden">
            <img
              src={project.coverImageUrl}
              alt={project.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <span className="text-4xl font-bold text-muted-foreground/30">
              {project.title.charAt(0)}
            </span>
          </div>
        )}
      </Link>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/showcase/${project.id}`}>
            <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
              {project.title}
            </h3>
          </Link>
        </div>
        {/* 标签 */}
        <div className="flex flex-wrap gap-1.5">
          {(project.tags || []).slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {project.description || '暂无描述'}
        </p>
      </CardContent>

      <CardFooter className="pt-2 border-t border-border/40">
        <div className="flex items-center justify-between w-full">
          {/* 作者 */}
          <Link
            href={`/user/${project.author.username}`}
            className="flex items-center gap-2 group/author"
          >
            {project.author.avatarUrl ? (
              <img
                src={project.author.avatarUrl}
                alt={project.author.username}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-primary flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {project.author.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-xs text-muted-foreground group-hover/author:text-primary transition-colors">
              {project.author.username}
            </span>
          </Link>

          {/* 统计数据 */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              {project.likes}
            </span>
            <span>{timeAgo(project.createdAt)}</span>
          </div>
        </div>

        {/* 链接 */}
        <div className="flex items-center gap-2 mt-3">
          {project.demoUrl && (
            <a
              href={project.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Demo
            </a>
          )}
          {project.sourceUrl && (
            <a
              href={project.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Github className="w-3 h-3" />
              源码
            </a>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
