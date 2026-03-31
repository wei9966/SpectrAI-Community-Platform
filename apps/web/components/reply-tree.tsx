'use client';

import * as React from 'react';
import Link from 'next/link';
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoteButton } from './vote-button';
import { MarkdownRenderer } from './markdown-renderer';
import { cn } from '@/lib/utils';

interface Reply {
  id: string;
  content: string;
  parentId: string | null;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  voteScore: number;
  userVote?: 1 | -1 | 0;
  createdAt: Date;
  replies?: Reply[];
  isBestAnswer?: boolean;
}

interface ReplyTreeProps {
  replies: Reply[];
  postId: string;
  onVote: (replyId: string, value: 1 | -1) => Promise<void>;
  onReply?: (parentId: string) => void;
  depth?: number;
  maxDepth?: number;
}

function ReplyItem({
  reply,
  postId,
  onVote,
  onReply,
  depth = 0,
  maxDepth = 5,
}: {
  reply: Reply;
  postId: string;
  onVote: (replyId: string, value: 1 | -1) => Promise<void>;
  onReply?: (parentId: string) => void;
  depth: number;
  maxDepth: number;
}) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const hasReplies = reply.replies && reply.replies.length > 0;
  const isDeep = depth >= maxDepth;

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
    <div className={cn(
      'relative',
      depth > 0 && 'ml-6 pl-4 border-l-2 border-border'
    )}>
      <div className="flex gap-3 py-4">
        {/* 投票 */}
        <VoteButton
          score={reply.voteScore}
          userVote={reply.userVote}
          onVote={(value) => onVote(reply.id, value)}
          size="sm"
        />

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          {/* 作者信息 */}
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={`/user/${reply.author.username}`}
              className="flex items-center gap-2 group"
            >
              {reply.author.avatarUrl ? (
                <img
                  src={reply.author.avatarUrl}
                  alt={reply.author.username}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-primary flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {reply.author.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="font-medium text-sm group-hover:text-primary transition-colors">
                {reply.author.username}
              </span>
            </Link>
            <span className="text-xs text-muted-foreground">
              {timeAgo(reply.createdAt)}
            </span>
            {reply.isBestAnswer && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">
                最佳答案
              </span>
            )}
          </div>

          {/* 内容 */}
          <div className="text-sm">
            <MarkdownRenderer content={reply.content} />
          </div>

          {/* 操作 */}
          <div className="flex items-center gap-4 mt-2">
            {onReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReply(reply.id)}
                className="h-7 text-xs"
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                回复
              </Button>
            )}
            {hasReplies && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-7 text-xs"
              >
                {isCollapsed ? (
                  <>
                    <ChevronDown className="w-3 h-3 mr-1" />
                    展开 {reply.replies!.length} 条回复
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3 h-3 mr-1" />
                    收起
                  </>
                )}
              </Button>
            )}
          </div>

          {/* 子回复 */}
          {!isCollapsed && hasReplies && !isDeep && (
            <div className="mt-2">
              {reply.replies!.map((childReply) => (
                <ReplyItem
                  key={childReply.id}
                  reply={childReply}
                  postId={postId}
                  onVote={onVote}
                  onReply={onReply}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                />
              ))}
            </div>
          )}

          {/* 超过深度的回复折叠显示 */}
          {!isCollapsed && hasReplies && isDeep && (
            <div className="mt-2 p-3 rounded-lg bg-secondary/30 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(true)}
                className="text-xs"
              >
                <ChevronDown className="w-3 h-3 mr-1" />
                查看更多回复 ({reply.replies!.length})
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const ReplyTree = React.memo(function ReplyTree({
  replies,
  postId,
  onVote,
  onReply,
  depth = 0,
  maxDepth = 5,
}: ReplyTreeProps) {
  return (
    <div className="space-y-1">
      {replies.map((reply) => (
        <ReplyItem
          key={reply.id}
          reply={reply}
          postId={postId}
          onVote={onVote}
          onReply={onReply}
          depth={depth}
          maxDepth={maxDepth}
        />
      ))}
    </div>
  );
});
