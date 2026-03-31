'use client';

import * as React from 'react';
import Link from 'next/link';
import { MessageSquare, Pin, Lock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PostCardProps {
  post: {
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
    viewCount?: number;
    isPinned?: boolean;
    isLocked?: boolean;
    bestAnswerId?: string | null;
    tags?: string[];
    createdAt: Date;
  };
  showCategory?: boolean;
  showExcerpt?: boolean;
}

export function PostCard({
  post,
  showCategory = false,
  showExcerpt = true,
}: PostCardProps) {
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
        return `${interval}${unit === 'year' ? '年' : unit === 'month' ? '个月' : unit === 'week' ? '周' : unit === 'day' ? '天' : unit === 'hour' ? '小时' : unit === 'minute' ? '分钟' : ''}前`;
      }
    }
    return '刚刚';
  };

  return (
    <Card className={cn(
      'hover:bg-secondary/30 transition-colors',
      post.isPinned && 'border-primary/50 bg-primary/5'
    )}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* 投票分数 */}
          <div className="flex flex-col items-center justify-center min-w-[50px]">
            <span className={cn(
              'text-lg font-bold',
              post.voteScore > 0 && 'text-orange-500',
              post.voteScore < 0 && 'text-blue-500',
              post.voteScore === 0 && 'text-muted-foreground'
            )}>
              {post.voteScore}
            </span>
            <span className="text-xs text-muted-foreground">票</span>
          </div>

          {/* 内容 */}
          <div className="flex-1 min-w-0">
            {/* 标题行 */}
            <div className="flex items-center gap-2 mb-1">
              {post.isPinned && (
                <Pin className="w-4 h-4 text-primary flex-shrink-0" />
              )}
              {post.isLocked && (
                <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
              {post.bestAnswerId && (
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              )}
              <Link
                href={`/forum/post/${post.id}`}
                className="font-semibold text-lg hover:text-primary transition-colors line-clamp-1"
              >
                {post.title}
              </Link>
            </div>

            {/* 元信息 */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mb-2">
              {/* 作者 */}
              <Link
                href={`/user/${post.author.username}`}
                className="flex items-center gap-1.5 hover:text-foreground"
              >
                {post.author.avatarUrl ? (
                  <img
                    src={post.author.avatarUrl}
                    alt={post.author.username}
                    className="w-5 h-5 rounded-full"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gradient-primary flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {post.author.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span>{post.author.username}</span>
              </Link>

              {/* 时间 */}
              <span>{timeAgo(post.createdAt)}</span>

              {/* 板块 */}
              {showCategory && (
                <Link
                  href={`/forum/${post.category.slug}`}
                  className="hover:text-foreground"
                >
                  {post.category.name}
                </Link>
              )}

              {/* 回复数 */}
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                {post.replyCount}
              </span>

              {/* 浏览数 */}
              {post.viewCount !== undefined && (
                <span>{post.viewCount} 阅读</span>
              )}
            </div>

            {/* 标签 */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {post.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* 摘要 */}
            {showExcerpt && post.content && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {post.content.replace(/[#*`]/g, '').slice(0, 150)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
