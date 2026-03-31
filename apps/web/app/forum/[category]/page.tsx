'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pen, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PostCard } from '@/components/post-card';
import { Pagination } from '@/components/Pagination';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

interface ForumPost {
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
  viewCount: number;
  isPinned?: boolean;
  isLocked?: boolean;
  bestAnswerId?: string | null;
  tags?: string[];
  createdAt: Date;
}

type SortOption = 'latest' | 'hot' | 'unanswered';

export default function CategoryPage() {
  const params = useParams();
  const categorySlug = params.category as string;
  const [sortBy, setSortBy] = React.useState<SortOption>('latest');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const itemsPerPage = 10;

  React.useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsAuthenticated(!!token);
  }, []);

  // Mock 帖子数据
  const allPosts: ForumPost[] = React.useMemo(() => {
    const posts: ForumPost[] = [
      {
        id: 'p1',
        title: '如何使用 SpectrAI 构建多代理系统',
        content: '最近在研究多代理系统的构建，分享一些心得体会...',
        author: {
          id: 'u1',
          username: 'AgentExpert',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AgentExpert',
        },
        category: { id: 'c1', name: '综合讨论', slug: 'general' },
        replyCount: 45,
        voteScore: 128,
        viewCount: 1234,
        isPinned: true,
        tags: ['多代理', '架构'],
        createdAt: new Date('2025-03-30T10:00:00Z'),
      },
      {
        id: 'p2',
        title: '【已解决】工作流执行失败怎么排查？',
        content: '按照文档配置的工作流一直执行失败，错误信息如下...',
        author: {
          id: 'u2',
          username: 'NewbieDev',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NewbieDev',
        },
        category: { id: 'c1', name: '综合讨论', slug: 'general' },
        replyCount: 12,
        voteScore: 23,
        viewCount: 456,
        bestAnswerId: 'r1',
        tags: ['工作流', '调试'],
        createdAt: new Date('2025-03-29T15:30:00Z'),
      },
      {
        id: 'p3',
        title: 'SpectrAI 与其他 AI 平台的对比分析',
        content: '从功能、性能、易用性等角度对比了主流 AI 平台...',
        author: {
          id: 'u3',
          username: 'TechAnalyst',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TechAnalyst',
        },
        category: { id: 'c1', name: '综合讨论', slug: 'general' },
        replyCount: 89,
        voteScore: 234,
        viewCount: 3456,
        tags: ['对比', '分析'],
        createdAt: new Date('2025-03-28T09:00:00Z'),
      },
      {
        id: 'p4',
        title: '求推荐好用的 Prompt 优化工具',
        content: '大家有什么推荐的 Prompt 优化工具吗？',
        author: {
          id: 'u4',
          username: 'PromptNewbie',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PromptNewbie',
        },
        category: { id: 'c1', name: '综合讨论', slug: 'general' },
        replyCount: 34,
        voteScore: 56,
        viewCount: 789,
        createdAt: new Date('2025-03-27T14:00:00Z'),
      },
      {
        id: 'p5',
        title: 'MCP Server 开发入门教程',
        content: '分享一个 MCP Server 开发的完整入门教程...',
        author: {
          id: 'u5',
          username: 'MCPDev',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MCPDev',
        },
        category: { id: 'c1', name: '综合讨论', slug: 'general' },
        replyCount: 67,
        voteScore: 189,
        viewCount: 2345,
        tags: ['MCP', '教程'],
        createdAt: new Date('2025-03-26T11:00:00Z'),
      },
    ];

    // 添加更多帖子以测试分页
    for (let i = 6; i <= 25; i++) {
      posts.push({
        id: `p${i}`,
        title: `帖子标题 ${i}`,
        content: `这是第 ${i} 个帖子的摘要内容...`,
        author: {
          id: `u${i}`,
          username: `User${i}`,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=User${i}`,
        },
        category: { id: 'c1', name: '综合讨论', slug: 'general' },
        replyCount: Math.floor(Math.random() * 100),
        voteScore: Math.floor(Math.random() * 200),
        viewCount: Math.floor(Math.random() * 5000),
        tags: ['标签1', '标签2'],
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      });
    }

    return posts;
  }, []);

  const sortedPosts = React.useMemo(() => {
    const sorted = [...allPosts];
    if (sortBy === 'hot') {
      sorted.sort((a, b) => b.voteScore - a.voteScore);
    } else if (sortBy === 'unanswered') {
      return sorted.filter((p) => p.replyCount === 0);
    } else {
      // latest - 置顶帖子优先，然后按时间
      sorted.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    return sorted;
  }, [allPosts, sortBy]);

  const totalPages = Math.ceil(sortedPosts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPosts = sortedPosts.slice(startIndex, startIndex + itemsPerPage);

  const categoryNames: Record<string, string> = {
    general: '综合讨论',
    showcase: '资源分享',
    'feature-requests': '功能建议',
    help: '问题求助',
    announcements: '公告',
    developers: '开发者社区',
  };

  const categoryName = categoryNames[categorySlug] || categorySlug;

  return (
    <div className="container py-8 md:py-12">
      {/* 返回按钮 */}
      <Link
        href="/forum"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回论坛
      </Link>

      {/* 头部 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">{categoryName}</h1>
          <p className="text-muted-foreground">
            共 {sortedPosts.length} 个帖子
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

      {/* 排序栏 */}
      <div className="flex items-center gap-4 mb-6">
        <TabsPrimitive.Root value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <TabsPrimitive.List className="flex border-b border-border">
            <TabsPrimitive.Trigger
              value="latest"
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors relative",
                "text-muted-foreground hover:text-foreground",
                "data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary",
                "-mb-px"
              )}
            >
              最新
            </TabsPrimitive.Trigger>
            <TabsPrimitive.Trigger
              value="hot"
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors relative",
                "text-muted-foreground hover:text-foreground",
                "data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary",
                "-mb-px"
              )}
            >
              最热
            </TabsPrimitive.Trigger>
            <TabsPrimitive.Trigger
              value="unanswered"
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors relative",
                "text-muted-foreground hover:text-foreground",
                "data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary",
                "-mb-px"
              )}
            >
              未回复
            </TabsPrimitive.Trigger>
          </TabsPrimitive.List>
        </TabsPrimitive.Root>
      </div>

      {/* 帖子列表 */}
      {paginatedPosts.length > 0 ? (
        <>
          <div className="space-y-3 mb-6">
            {paginatedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                showCategory={false}
              />
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
