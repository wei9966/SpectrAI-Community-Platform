'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PostCard } from '@/components/post-card';
import { Pagination } from '@/components/Pagination';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface ForumPost {
  id: string;
  title: string;
  content?: string;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  replyCount: number;
  voteScore: number;
  viewCount: number;
  isPinned?: boolean;
  isLocked?: boolean;
  bestAnswerId?: string | null;
  tags?: string[];
  createdAt: string;
}

type SortOption = 'newest' | 'hot' | 'unanswered';

export default function CategoryPage() {
  const params = useParams();
  const categorySlug = params.category as string;
  const [sortBy, setSortBy] = React.useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [posts, setPosts] = React.useState<ForumPost[]>([]);
  const [totalPages, setTotalPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [categoryName, setCategoryName] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const itemsPerPage = 10;

  React.useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsAuthenticated(!!token);
  }, []);

  React.useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(
      `${API_BASE}/api/forum/categories/${categorySlug}/posts?page=${currentPage}&limit=${itemsPerPage}&sort=${sortBy}`,
      { headers }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPosts(data.data.items || []);
          const pg = data.data.pagination;
          if (pg) {
            setTotal(pg.total);
            setTotalPages(pg.totalPages);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Also fetch category name
    fetch(`${API_BASE}/api/forum/categories`, { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          const cat = data.data.find(
            (c: { slug: string }) => c.slug === categorySlug
          );
          if (cat) setCategoryName(cat.name);
        }
      })
      .catch(() => {});
  }, [categorySlug, sortBy, currentPage]);

  const handleSortChange = (value: string) => {
    setSortBy(value as SortOption);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="container py-8 md:py-12">
        <div className="h-6 w-20 bg-muted rounded animate-pulse mb-6" />
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-6" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-4 animate-pulse">
              <div className="h-5 bg-muted rounded w-3/4 mb-2" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12">
      <Link
        href="/forum"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回论坛
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">
            {categoryName || categorySlug}
          </h1>
          <p className="text-muted-foreground">共 {total} 个帖子</p>
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

      <div className="flex items-center gap-4 mb-6">
        <TabsPrimitive.Root value={sortBy} onValueChange={handleSortChange}>
          <TabsPrimitive.List className="flex border-b border-border">
            <TabsPrimitive.Trigger
              value="newest"
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors relative',
                'text-muted-foreground hover:text-foreground',
                'data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary',
                '-mb-px'
              )}
            >
              最新
            </TabsPrimitive.Trigger>
            <TabsPrimitive.Trigger
              value="hot"
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors relative',
                'text-muted-foreground hover:text-foreground',
                'data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary',
                '-mb-px'
              )}
            >
              最热
            </TabsPrimitive.Trigger>
            <TabsPrimitive.Trigger
              value="unanswered"
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors relative',
                'text-muted-foreground hover:text-foreground',
                'data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary',
                '-mb-px'
              )}
            >
              未回复
            </TabsPrimitive.Trigger>
          </TabsPrimitive.List>
        </TabsPrimitive.Root>
      </div>

      {posts.length > 0 ? (
        <>
          <div className="space-y-3 mb-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} showCategory={false} />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      ) : (
        <Card className="py-12">
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">暂无帖子</p>
            {isAuthenticated && (
              <Link href="/forum/new">
                <Button variant="outline">成为第一个发帖的人</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
