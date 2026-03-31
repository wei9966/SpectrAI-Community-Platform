'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Wrench,
  Lightbulb,
  HelpCircle,
  Megaphone,
  Users,
  Pen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PostCard } from '@/components/post-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  postCount: number;
  todayPostCount: number;
}

interface RecentPost {
  id: string;
  title: string;
  content?: string;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  replyCount: number;
  voteScore: number;
  createdAt: Date;
}

// Mock 板块数据
const mockCategories: Category[] = [
  {
    id: 'c1',
    name: '综合讨论',
    slug: 'general',
    description: '关于 SpectrAI 的任何话题都可以在这里讨论',
    icon: 'MessageSquare',
    postCount: 1234,
    todayPostCount: 56,
  },
  {
    id: 'c2',
    name: '资源分享',
    slug: 'showcase',
    description: '分享你的 Workflow、Team、Skill、MCP 作品',
    icon: 'Wrench',
    postCount: 856,
    todayPostCount: 23,
  },
  {
    id: 'c3',
    name: '功能建议',
    slug: 'feature-requests',
    description: '对 SpectrAI 的功能建议和需求反馈',
    icon: 'Lightbulb',
    postCount: 432,
    todayPostCount: 12,
  },
  {
    id: 'c4',
    name: '问题求助',
    slug: 'help',
    description: '遇到问题？在这里寻求社区帮助',
    icon: 'HelpCircle',
    postCount: 567,
    todayPostCount: 34,
  },
  {
    id: 'c5',
    name: '公告',
    slug: 'announcements',
    description: 'SpectrAI 官方公告和更新通知',
    icon: 'Megaphone',
    postCount: 28,
    todayPostCount: 1,
  },
  {
    id: 'c6',
    name: '开发者社区',
    slug: 'developers',
    description: '开发者交流、API 使用、插件开发',
    icon: 'Users',
    postCount: 345,
    todayPostCount: 8,
  },
];

// Mock 最新帖子数据
const mockRecentPosts: RecentPost[] = [
  {
    id: 'p1',
    title: '如何使用 SpectrAI 构建多代理系统',
    content: '最近在研究多代理系统的构建，分享一些心得...',
    author: {
      id: 'u1',
      username: 'AgentExpert',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AgentExpert',
    },
    category: {
      id: 'c1',
      name: '综合讨论',
      slug: 'general',
    },
    replyCount: 45,
    voteScore: 128,
    createdAt: new Date('2025-03-30T10:00:00Z'),
  },
  {
    id: 'p2',
    title: '【已解决】工作流执行失败怎么排查？',
    content: '按照文档配置的工作流一直执行失败，不知道哪里出了问题...',
    author: {
      id: 'u2',
      username: 'NewbieDev',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NewbieDev',
    },
    category: {
      id: 'c4',
      name: '问题求助',
      slug: 'help',
    },
    replyCount: 12,
    voteScore: 23,
    createdAt: new Date('2025-03-29T15:30:00Z'),
  },
  {
    id: 'p3',
    title: '建议：增加工作流版本管理功能',
    content: '目前工作流没有版本管理，希望能增加类似 Git 的版本控制...',
    author: {
      id: 'u3',
      username: 'FeatureReq',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=FeatureReq',
    },
    category: {
      id: 'c3',
      name: '功能建议',
      slug: 'feature-requests',
    },
    replyCount: 67,
    voteScore: 234,
    createdAt: new Date('2025-03-28T09:00:00Z'),
  },
  {
    id: 'p4',
    title: 'SpectrAI v2.0 发布公告',
    content: '我们很高兴宣布 SpectrAI v2.0 正式发布！这次更新包含...',
    author: {
      id: 'u4',
      username: 'Official',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Official',
    },
    category: {
      id: 'c5',
      name: '公告',
      slug: 'announcements',
    },
    replyCount: 156,
    voteScore: 567,
    createdAt: new Date('2025-03-25T12:00:00Z'),
  },
  {
    id: 'p5',
    title: '我的第一个 MCP Server 插件开发记录',
    content: '分享一下我开发的一个 MCP Server 插件的经验...',
    author: {
      id: 'u5',
      username: 'PluginDev',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PluginDev',
    },
    category: {
      id: 'c6',
      name: '开发者社区',
      slug: 'developers',
    },
    replyCount: 34,
    voteScore: 89,
    createdAt: new Date('2025-03-27T14:00:00Z'),
  },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  Wrench,
  Lightbulb,
  HelpCircle,
  Megaphone,
  Users,
  Pen,
};

export default function ForumPage() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsAuthenticated(!!token);
  }, []);

  return (
    <div className="container py-8 md:py-12">
      {/* 头部 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">社区论坛</h1>
          <p className="text-muted-foreground">
            在这里讨论 SpectrAI、分享资源、寻求帮助
          </p>
        </div>
        {isAuthenticated && (
          <Link href="/forum/new">
            <Button variant="gradient">
              <Pen className="w-4 h-4 mr-2" />
              发布帖子
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 板块列表 */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold mb-4">板块</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockCategories.map((category) => {
              const IconComponent = iconMap[category.icon] || MessageSquare;
              return (
                <Link key={category.id} href={`/forum/${category.slug}`}>
                  <Card className="hover:bg-secondary/30 transition-colors h-full">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <IconComponent className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold">{category.name}</h3>
                            {category.todayPostCount > 0 && (
                              <Badge variant="default" className="text-xs">
                                +{category.todayPostCount} 今日
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {category.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {category.postCount} 帖子
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          {/* 最新帖子 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">最新帖子</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockRecentPosts.map((post) => (
                <div key={post.id} className="flex gap-3">
                  <Link
                    href={`/user/${post.author.username}`}
                    className="flex-shrink-0"
                  >
                    {post.author.avatarUrl ? (
                      <img
                        src={post.author.avatarUrl}
                        alt={post.author.username}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {post.author.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/forum/post/${post.id}`}
                      className="font-medium text-sm hover:text-primary transition-colors line-clamp-1"
                    >
                      {post.title}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <Link
                        href={`/forum/${post.category.slug}`}
                        className="hover:text-foreground"
                      >
                        {post.category.name}
                      </Link>
                      <span>·</span>
                      <span>{post.replyCount} 回复</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 论坛统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">论坛统计</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">总帖子数</span>
                <span className="font-medium">3,462</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">今日新帖</span>
                <span className="font-medium">134</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">总用户数</span>
                <span className="font-medium">12,856</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">在线用户</span>
                <span className="font-medium text-green-500">234</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
