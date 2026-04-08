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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { API_BASE } from '@/lib/api-base';

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
  createdAt: string;
}

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
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [recentPosts, setRecentPosts] = React.useState<RecentPost[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsAuthenticated(!!token);

    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    Promise.all([
      fetch(`${API_BASE}/api/forum/categories`, { headers })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setCategories(Array.isArray(data.data) ? data.data : data.data?.items || []);
          }
        }),
      fetch(`${API_BASE}/api/forum/posts?limit=5&sort=newest`, { headers })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setRecentPosts(data.data?.items || (Array.isArray(data.data) ? data.data : []));
          }
        }),
    ])
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const totalPosts = React.useMemo(
    () => categories.reduce((sum, c) => sum + (c.postCount || 0), 0),
    [categories]
  );

  const todayPosts = React.useMemo(
    () => categories.reduce((sum, c) => sum + (c.todayPostCount || 0), 0),
    [categories]
  );

  if (loading) {
    return (
      <div className="container py-8 md:py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="h-8 w-32 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-6 w-16 bg-muted rounded animate-pulse mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-muted rounded-lg" />
                      <div className="flex-1">
                        <div className="h-5 bg-muted rounded w-1/2 mb-2" />
                        <div className="h-3 bg-muted rounded w-full mb-1" />
                        <div className="h-3 bg-muted rounded w-1/3 mt-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <Card className="animate-pulse">
              <CardHeader><div className="h-5 w-20 bg-muted rounded" /></CardHeader>
              <CardContent className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 bg-muted rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-3/4 mb-1" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="animate-pulse">
              <CardHeader><div className="h-5 w-20 bg-muted rounded" /></CardHeader>
              <CardContent className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 bg-muted rounded w-20" />
                    <div className="h-4 bg-muted rounded w-12" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

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

      {error && (
        <div className="text-center py-8 text-muted-foreground mb-6">
          数据加载失败，请刷新页面重试
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 板块列表 */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold mb-4">板块</h2>
          {categories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((category) => {
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
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              暂无板块数据
            </div>
          )}
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          {/* 最新帖子 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">最新帖子</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentPosts.length > 0 ? (
                recentPosts.map((post) => (
                  <div key={post.id} className="flex gap-3">
                    <Link
                      href={`/user/${post.author?.username || 'unknown'}`}
                      className="flex-shrink-0"
                    >
                      {post.author?.avatarUrl ? (
                        <img
                          src={post.author.avatarUrl}
                          alt={post.author?.username || 'unknown'}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {(post.author?.username || 'U').charAt(0).toUpperCase()}
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
                          href={`/forum/${post.category?.slug || 'general'}`}
                          className="hover:text-foreground"
                        >
                          {post.category?.name || '未知分类'}
                        </Link>
                        <span>·</span>
                        <span>{post.replyCount} 回复</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  暂无帖子
                </p>
              )}
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
                <span className="font-medium">{totalPosts.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">今日新帖</span>
                <span className="font-medium">{todayPosts.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">板块数量</span>
                <span className="font-medium">{categories.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
