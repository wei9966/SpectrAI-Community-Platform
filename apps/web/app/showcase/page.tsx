'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus, Flame, Clock, ExternalLink, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PublicUser } from '@spectrai-community/shared';

// 项目类型（基于 project schema）
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
}

// Mock 数据
const mockProjects: ShowcaseProject[] = [
  {
    id: 'p1',
    title: 'AI 代码审查助手',
    description: '基于 GPT-4 的自动化代码审查工具，支持检测安全漏洞、性能问题和代码规范违规。可集成到 GitHub Actions 中自动运行。',
    coverImageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=400&fit=crop',
    demoUrl: 'https://demo.example.com/code-review',
    sourceUrl: 'https://github.com/example/code-review',
    author: {
      id: 'u1',
      username: 'DevMaster',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DevMaster',
    },
    tags: ['GPT-4', '代码审查', 'GitHub Actions'],
    likes: 328,
    views: 4521,
    createdAt: new Date('2025-03-20T10:00:00Z'),
    updatedAt: new Date('2025-03-28T15:30:00Z'),
  },
  {
    id: 'p2',
    title: '智能数据分析平台',
    description: '拖拽式的可视化数据分析平台，支持连接多种数据源，自动生成分析报告和预测模型。',
    coverImageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop',
    demoUrl: 'https://demo.example.com/data-platform',
    sourceUrl: 'https://github.com/example/data-platform',
    author: {
      id: 'u2',
      username: 'DataWizard',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DataWizard',
    },
    tags: ['数据分析', '可视化', 'ML'],
    likes: 256,
    views: 3210,
    createdAt: new Date('2025-03-15T08:00:00Z'),
    updatedAt: new Date('2025-03-25T12:00:00Z'),
  },
  {
    id: 'p3',
    title: '自动化测试生成器',
    description: '利用 AI 自动生成单元测试和集成测试，提升测试覆盖率。',
    coverImageUrl: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&h=400&fit=crop',
    demoUrl: null,
    sourceUrl: 'https://github.com/example/test-generator',
    author: {
      id: 'u3',
      username: 'QAExpert',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=QAExpert',
    },
    tags: ['测试', '自动化', 'AI'],
    likes: 189,
    views: 2156,
    createdAt: new Date('2025-03-10T14:00:00Z'),
    updatedAt: new Date('2025-03-22T09:00:00Z'),
  },
  {
    id: 'p4',
    title: '实时协作白板',
    description: '多人实时协作的在线白板工具，支持绘图、便签、流程图等多种元素。',
    coverImageUrl: 'https://images.unsplash.com/photo-156ActionEditor5-141a5a9f9f09?w=800&h=400&fit=crop',
    demoUrl: 'https://demo.example.com/whiteboard',
    sourceUrl: null,
    author: {
      id: 'u4',
      username: 'CollabTools',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CollabTools',
    },
    tags: ['协作', '白板', '实时'],
    likes: 412,
    views: 5678,
    createdAt: new Date('2025-03-05T11:00:00Z'),
    updatedAt: new Date('2025-03-29T16:00:00Z'),
  },
  {
    id: 'p5',
    title: 'Prompt 管理工作流',
    description: '管理和优化 AI 提示词的工作流工具，支持版本控制和团队协作。',
    coverImageUrl: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&h=400&fit=crop',
    demoUrl: 'https://demo.example.com/prompt-workflow',
    sourceUrl: 'https://github.com/example/prompt-workflow',
    author: {
      id: 'u5',
      username: 'PromptPro',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PromptPro',
    },
    tags: ['Prompt', '工作流', '团队协作'],
    likes: 567,
    views: 7890,
    createdAt: new Date('2025-03-01T09:00:00Z'),
    updatedAt: new Date('2025-03-30T10:00:00Z'),
  },
  {
    id: 'p6',
    title: 'API 文档自动生成器',
    description: '从代码注释自动生成 API 文档，支持 Swagger UI 集成。',
    coverImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop',
    demoUrl: 'https://demo.example.com/api-docs',
    sourceUrl: 'https://github.com/example/api-docs-gen',
    author: {
      id: 'u6',
      username: 'DocuMaster',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DocuMaster',
    },
    tags: ['文档', 'API', '自动化'],
    likes: 234,
    views: 3456,
    createdAt: new Date('2025-02-28T13:00:00Z'),
    updatedAt: new Date('2025-03-20T11:00:00Z'),
  },
];

type SortOption = 'latest' | 'popular';

export default function ShowcasePage() {
  const [projects, setProjects] = React.useState(mockProjects);
  const [sortBy, setSortBy] = React.useState<SortOption>('latest');
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  // 检查认证状态
  React.useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsAuthenticated(!!token);
  }, []);

  // 排序
  const sortedProjects = React.useMemo(() => {
    const sorted = [...projects];
    if (sortBy === 'popular') {
      sorted.sort((a, b) => b.likes - a.likes);
    } else {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted;
  }, [projects, sortBy]);

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
          共 {sortedProjects.length} 个项目
        </span>
      </div>

      {/* 项目网格 */}
      {sortedProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProjects.map((project) => (
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
  timeAgo: (date: Date) => string;
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
          {project.tags.slice(0, 3).map((tag) => (
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
