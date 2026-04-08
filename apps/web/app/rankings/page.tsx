'use client';

import * as React from 'react';
import Link from 'next/link';
import { Trophy, TrendingUp, Flame, Clock, Medal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StarRating } from '@/components/star-rating';
import { cn } from '@/lib/utils';

import { API_BASE } from '@/lib/api-base';

// 排行榜条目类型
interface RankingItem {
  rank: number;
  id: string;
  name: string;
  description: string;
  type: string;
  tags: string[];
  downloads: number;
  likes: number;
  averageRating: number;
  ratingCount: number;
  favoriteCount: number;
  score: number;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  createdAt: string;
}

type TimeRange = 'week' | 'month' | 'all';
type SortBy = 'score' | 'downloads' | 'rating';

export default function RankingsPage() {
  const [timeRange, setTimeRange] = React.useState<TimeRange>('week');
  const [sortBy, setSortBy] = React.useState<SortBy>('score');
  const [rankings, setRankings] = React.useState<RankingItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // 从 API 获取排行榜数据
  React.useEffect(() => {
    let cancelled = false;

    async function fetchRankings() {
      setIsLoading(true);
      try {
        const apiSort = sortBy === 'score' ? 'rating' : sortBy === 'downloads' ? 'downloads' : 'favorites';
        const res = await fetch(
          `${API_BASE}/api/rankings/resources?period=${timeRange}&sort=${apiSort}&limit=20`
        );
        if (!res.ok) throw new Error('Failed to fetch rankings');

        const json = await res.json();
        if (cancelled) return;

        const data = json.data || json;
        const items: RankingItem[] = (data.items || []).map((item: any, index: number) => ({
          ...item,
          rank: index + 1,
        }));

        // 客户端按选中维度重新排序
        if (sortBy === 'downloads') {
          items.sort((a, b) => b.downloads - a.downloads);
        } else if (sortBy === 'rating') {
          items.sort((a, b) => b.averageRating - a.averageRating);
        }
        items.forEach((item, i) => { item.rank = i + 1; });

        setRankings(items);
      } catch (err) {
        console.error('Failed to load rankings:', err);
        if (!cancelled) setRankings([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchRankings();
    return () => { cancelled = true; };
  }, [timeRange, sortBy]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-lg font-bold text-muted-foreground">{rank}</span>;
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
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted/60 animate-pulse" />
          ))}
        </div>
      ) : rankings.length > 0 ? (
        <div className="space-y-3">
          {rankings.map((item) => (
            <Card
              key={item.id}
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
                  </div>

                  {/* 资源信息 */}
                  <Link
                    href={`/resource/${item.id}`}
                    className="flex-1 min-w-0 group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-1">
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <Link
                            href={`/user/${item.author.username}`}
                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {item.author.avatarUrl && (
                              <img
                                src={item.author.avatarUrl}
                                alt={item.author.username}
                                className="w-4 h-4 rounded-full"
                              />
                            )}
                            {item.author.username}
                          </Link>
                          <StarRating
                            value={item.averageRating}
                            count={item.ratingCount}
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
                            {item.downloads >= 1000
                              ? `${(item.downloads / 1000).toFixed(1)}k`
                              : item.downloads}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">喜欢</div>
                          <div className="font-semibold">
                            {item.likes >= 1000
                              ? `${(item.likes / 1000).toFixed(1)}k`
                              : item.likes}
                          </div>
                        </div>
                        <div className="text-center min-w-[80px]">
                          <div className="text-muted-foreground">综合评分</div>
                          <div className="font-semibold text-primary">
                            {item.score.toFixed(2)}
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
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">暂无排行数据</p>
        </div>
      )}
    </div>
  );
}
