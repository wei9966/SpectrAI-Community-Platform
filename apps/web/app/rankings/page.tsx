'use client';

import * as React from 'react';
import Link from 'next/link';
import { Trophy, TrendingUp, Flame, Clock, Medal, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/star-rating';
import { cn } from '@/lib/utils';
import type { PublicResource } from '@spectrai-community/shared';

// 排行榜条目类型
interface RankingItem {
  rank: number;
  previousRank?: number;
  resource: PublicResource & {
    averageRating: number;
    ratingCount: number;
    score: number; // 综合评分
  };
}

type TimeRange = 'week' | 'month' | 'all';
type SortBy = 'score' | 'downloads' | 'rating';

export default function RankingsPage() {
  const [timeRange, setTimeRange] = React.useState<TimeRange>('week');
  const [sortBy, setSortBy] = React.useState<SortBy>('score');

  // Mock 排行榜数据
  const rankings: RankingItem[] = React.useMemo(() => {
    const items: RankingItem[] = mockResources.map((resource, index) => {
      const rating = 3.5 + Math.random() * 1.5;
      return {
        rank: index + 1,
        previousRank: index + Math.floor(Math.random() * 5) - 2,
        resource: {
          ...resource,
          averageRating: rating,
          ratingCount: Math.floor(Math.random() * 500) + 50,
          score: rating * 100 + resource.downloads * 0.1 + resource.likes * 0.5,
        } as any,
      };
    });

    // 按 score 排序
    items.sort((a, b) => b.resource.score - a.resource.score);

    // 重新分配排名
    return items.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }, []);

  const filteredRankings = React.useMemo(() => {
    let filtered = [...rankings];
    if (sortBy === 'score') {
      filtered.sort((a, b) => b.resource.score - a.resource.score);
    } else if (sortBy === 'downloads') {
      filtered.sort((a, b) => b.resource.downloads - a.resource.downloads);
    } else if (sortBy === 'rating') {
      filtered.sort((a, b) => b.resource.averageRating - a.resource.averageRating);
    }
    return filtered;
  }, [rankings, sortBy]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-lg font-bold text-muted-foreground">{rank}</span>;
  };

  const getRankChange = (item: RankingItem) => {
    if (item.previousRank === undefined) return null;
    const diff = item.previousRank - item.rank;
    if (diff === 0) return null;
    if (diff > 0) {
      return (
        <span className="flex items-center gap-0.5 text-green-500 text-xs">
          <ArrowUp className="w-3 h-3" />
          {diff}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-0.5 text-red-500 text-xs">
        <ArrowDown className="w-3 h-3" />
        {Math.abs(diff)}
      </span>
    );
  };

  return (
    <div className="container py-8 md:py-12">
      {/* 头部 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">排行榜</h1>
        <p className="text-muted-foreground">
          发现最受欢迎的 SpectrAI 资源
        </p>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 p-4 bg-card rounded-lg border">
        {/* 时间范围 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">时间：</span>
          <div className="flex gap-1">
            <Button
              variant={timeRange === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange('week')}
            >
              <Clock className="w-4 h-4 mr-1.5" />
              本周
            </Button>
            <Button
              variant={timeRange === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange('month')}
            >
              本月
            </Button>
            <Button
              variant={timeRange === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange('all')}
            >
              全部
            </Button>
          </div>
        </div>

        {/* 排序方式 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">排序：</span>
          <div className="flex gap-1">
            <Button
              variant={sortBy === 'score' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('score')}
            >
              <Trophy className="w-4 h-4 mr-1.5" />
              综合
            </Button>
            <Button
              variant={sortBy === 'downloads' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('downloads')}
            >
              <TrendingUp className="w-4 h-4 mr-1.5" />
              下载
            </Button>
            <Button
              variant={sortBy === 'rating' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('rating')}
            >
              <Flame className="w-4 h-4 mr-1.5" />
              评分
            </Button>
          </div>
        </div>
      </div>

      {/* 排行榜列表 */}
      <div className="space-y-3">
        {filteredRankings.map((item) => (
          <Card
            key={item.resource.id}
            className={cn(
              'hover:bg-secondary/30 transition-colors',
              item.rank <= 3 && 'border-primary/30 bg-primary/5'
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* 排名 */}
                <div className="flex flex-col items-center min-w-[60px]">
                  {getRankIcon(item.rank)}
                  {getRankChange(item)}
                </div>

                {/* 资源信息 */}
                <Link
                  href={`/resource/${item.resource.id}`}
                  className="flex-1 min-w-0 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-1">
                        {item.resource.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <Link
                          href={`/user/${item.resource.author.username}`}
                          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.resource.author.avatarUrl && (
                            <img
                              src={item.resource.author.avatarUrl}
                              alt={item.resource.author.username}
                              className="w-4 h-4 rounded-full"
                            />
                          )}
                          {item.resource.author.username}
                        </Link>
                        <StarRating
                          value={item.resource.averageRating}
                          count={item.resource.ratingCount}
                          size="sm"
                          readOnly
                          showCount
                        />
                      </div>
                    </div>

                    {/* 统计数据 */}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="text-muted-foreground">下载</div>
                        <div className="font-semibold">
                          {item.resource.downloads >= 1000
                            ? `${(item.resource.downloads / 1000).toFixed(1)}k`
                            : item.resource.downloads}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">喜欢</div>
                        <div className="font-semibold">
                          {item.resource.likes >= 1000
                            ? `${(item.resource.likes / 1000).toFixed(1)}k`
                            : item.resource.likes}
                        </div>
                      </div>
                      <div className="text-center min-w-[80px]">
                        <div className="text-muted-foreground">综合评分</div>
                        <div className="font-semibold text-primary">
                          {item.resource.score.toFixed(0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Mock 数据（复用）
const mockResources: PublicResource[] = [
  {
    id: '1',
    name: 'SpectrAI 多会话编排 Workflow',
    description: '自动管理多个 AI CLI 会话，实现任务分配、进度跟踪和结果汇总的完整工作流',
    type: 'workflow' as any,
    author: {
      id: 'user1',
      username: 'AIBuilder',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AIBuilder',
    },
    isPublished: true,
    version: '1.2.0',
    tags: ['自动化', '会话管理', '效率工具'],
    content: {} as any,
    downloads: 1234,
    likes: 567,
    createdAt: new Date('2025-03-15T10:00:00Z'),
    updatedAt: new Date('2025-03-28T15:30:00Z'),
  },
  {
    id: '2',
    name: '前端开发专家团队 Team',
    description: '包含 React、Vue、Angular 专家的完整前端开发团队配置',
    type: 'team' as any,
    author: {
      id: 'user2',
      username: 'TeamMaster',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TeamMaster',
    },
    isPublished: true,
    version: '2.0.1',
    tags: ['前端', 'React', 'Vue'],
    content: {} as any,
    downloads: 892,
    likes: 421,
    createdAt: new Date('2025-03-10T08:00:00Z'),
    updatedAt: new Date('2025-03-25T12:00:00Z'),
  },
  {
    id: '3',
    name: '代码审查 Skill',
    description: '自动检测代码质量问题、安全漏洞和性能问题的智能审查技能',
    type: 'skill' as any,
    author: {
      id: 'user3',
      username: 'CodeReviewer',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CodeReviewer',
    },
    isPublished: true,
    version: '1.5.0',
    tags: ['代码质量', '安全'],
    content: {} as any,
    downloads: 2156,
    likes: 983,
    createdAt: new Date('2025-03-01T09:00:00Z'),
    updatedAt: new Date('2025-03-29T14:00:00Z'),
  },
  {
    id: '4',
    name: 'GitHub MCP Server',
    description: '完整的 GitHub API 集成，支持 Issue、PR、Repository 管理',
    type: 'mcp' as any,
    author: {
      id: 'user4',
      username: 'MCPPublisher',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MCPPublisher',
    },
    isPublished: true,
    version: '3.1.0',
    tags: ['GitHub', 'API'],
    content: {} as any,
    downloads: 3421,
    likes: 1567,
    createdAt: new Date('2025-02-20T11:00:00Z'),
    updatedAt: new Date('2025-03-27T16:00:00Z'),
  },
  {
    id: '5',
    name: '数据分析 Workflow',
    description: '从数据导入、清洗、分析到可视化的完整数据分析流程',
    type: 'workflow' as any,
    author: {
      id: 'user5',
      username: 'DataPro',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DataPro',
    },
    isPublished: true,
    version: '1.0.3',
    tags: ['数据分析', '可视化'],
    content: {} as any,
    downloads: 756,
    likes: 342,
    createdAt: new Date('2025-03-18T13:00:00Z'),
    updatedAt: new Date('2025-03-26T10:00:00Z'),
  },
  {
    id: '6',
    name: 'Prompt 优化 Skill',
    description: '自动优化 AI 提示词，提升输出质量和准确率的智能技能',
    type: 'skill' as any,
    author: {
      id: 'user6',
      username: 'PromptEng',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PromptEng',
    },
    isPublished: true,
    version: '2.1.0',
    tags: ['Prompt', 'AI 优化'],
    content: {} as any,
    downloads: 1876,
    likes: 823,
    createdAt: new Date('2025-03-05T07:00:00Z'),
    updatedAt: new Date('2025-03-28T09:00:00Z'),
  },
];
