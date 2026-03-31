'use client';

import * as React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoteButtonProps {
  /** 当前投票分数 */
  score: number;
  /** 用户投票状态: 1= upvote, -1=downvote, 0=none */
  userVote?: 1 | -1 | 0;
  /** 投票变化回调 */
  onVote: (value: 1 | -1) => Promise<void>;
  /** 是否禁用 */
  disabled?: boolean;
  /** className */
  className?: string;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
}

export function VoteButton({
  score,
  userVote = 0,
  onVote,
  disabled = false,
  className,
  size = 'md',
}: VoteButtonProps) {
  const [optimisticScore, setOptimisticScore] = React.useState(score);
  const [optimisticVote, setOptimisticVote] = React.useState(userVote);
  const [isLoading, setIsLoading] = React.useState(false);

  // 同步外部状态
  React.useEffect(() => {
    setOptimisticScore(score);
  }, [score]);

  React.useEffect(() => {
    setOptimisticVote(userVote);
  }, [userVote]);

  const handleVote = async (value: 1 | -1) => {
    if (disabled || isLoading) return;

    const previousVote = optimisticVote;
    const previousScore = optimisticScore;

    // 计算新的投票状态和分数
    let newVote: 1 | -1 | 0;
    let scoreDelta: number;

    if (optimisticVote === value) {
      // 取消投票
      newVote = 0;
      scoreDelta = -value;
    } else if (optimisticVote === 0) {
      // 新增投票
      newVote = value;
      scoreDelta = value;
    } else {
      // 改变投票
      newVote = value;
      scoreDelta = value * 2;
    }

    // 乐观更新
    setOptimisticVote(newVote);
    setOptimisticScore(previousScore + scoreDelta);
    setIsLoading(true);

    try {
      await onVote(value);
    } catch {
      // 回滚
      setOptimisticVote(previousVote);
      setOptimisticScore(previousScore);
    } finally {
      setIsLoading(false);
    }
  };

  const sizes = {
    sm: { button: 'p-1', icon: 'w-4 h-4', text: 'text-sm' },
    md: { button: 'p-1.5', icon: 'w-5 h-5', text: 'text-base' },
    lg: { button: 'p-2', icon: 'w-6 h-6', text: 'text-lg' },
  };

  return (
    <div className={cn('flex flex-col items-center gap-0.5', className)}>
      {/* 顶 */}
      <button
        type="button"
        onClick={() => handleVote(1)}
        disabled={disabled || isLoading}
        className={cn(
          'rounded transition-all duration-200',
          sizes[size].button,
          optimisticVote === 1
            ? 'text-orange-500 bg-orange-500/10 hover:bg-orange-500/20'
            : 'text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10',
          (disabled || isLoading) && 'opacity-50 cursor-not-allowed'
        )}
        aria-label="顶"
      >
        <ChevronUp className={sizes[size].icon} />
      </button>

      {/* 分数 */}
      <span
        className={cn(
          'font-bold tabular-nums',
          sizes[size].text,
          optimisticVote === 1 && 'text-orange-500',
          optimisticVote === -1 && 'text-blue-500',
          optimisticVote === 0 && 'text-foreground'
        )}
      >
        {optimisticScore}
      </span>

      {/* 踩 */}
      <button
        type="button"
        onClick={() => handleVote(-1)}
        disabled={disabled || isLoading}
        className={cn(
          'rounded transition-all duration-200',
          sizes[size].button,
          optimisticVote === -1
            ? 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20'
            : 'text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10',
          (disabled || isLoading) && 'opacity-50 cursor-not-allowed'
        )}
        aria-label="踩"
      >
        <ChevronDown className={sizes[size].icon} />
      </button>
    </div>
  );
}
