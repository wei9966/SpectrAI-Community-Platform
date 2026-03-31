'use client';

import * as React from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  /** 是否已收藏 */
  isFavorited: boolean;
  /** 收藏数量 */
  count?: number;
  /** 尺寸大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 变化回调 */
  onToggle: () => Promise<boolean>;
  /** className */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

export function FavoriteButton({
  isFavorited,
  count,
  size = 'md',
  onToggle,
  className,
  disabled = false,
}: FavoriteButtonProps) {
  const [optimisticFavorited, setOptimisticFavorited] = React.useState(isFavorited);
  const [optimisticCount, setOptimisticCount] = React.useState(count ?? 0);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // 当 props 变化时同步状态
  React.useEffect(() => {
    setOptimisticFavorited(isFavorited);
  }, [isFavorited]);

  React.useEffect(() => {
    setOptimisticCount(count ?? 0);
  }, [count]);

  const handleClick = async () => {
    if (disabled || isLoading) return;

    // 乐观更新
    const previousFavorited = optimisticFavorited;
    const previousCount = optimisticCount;

    setOptimisticFavorited(!optimisticFavorited);
    setOptimisticCount(optimisticFavorited ? optimisticCount - 1 : optimisticCount + 1);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);

    setIsLoading(true);
    try {
      const success = await onToggle();
      if (!success) {
        // 回滚
        setOptimisticFavorited(previousFavorited);
        setOptimisticCount(previousCount);
      }
    } catch {
      // 回滚
      setOptimisticFavorited(previousFavorited);
      setOptimisticCount(previousCount);
    } finally {
      setIsLoading(false);
    }
  };

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const buttonSizes = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn(
        'relative flex items-center gap-1.5 rounded-full transition-all duration-200',
        'hover:scale-105 active:scale-95',
        buttonSizes[size],
        optimisticFavorited
          ? 'text-red-500 hover:text-red-600'
          : 'text-muted-foreground hover:text-red-500',
        (disabled || isLoading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      aria-label={optimisticFavorited ? '取消收藏' : '添加收藏'}
    >
      <Heart
        className={cn(
          sizes[size],
          'transition-all duration-200',
          optimisticFavorited ? 'fill-current' : 'fill-transparent',
          isAnimating && 'animate-pulse scale-125'
        )}
      />
      {optimisticCount !== undefined && (
        <span className={cn('text-sm font-medium tabular-nums', optimisticFavorited && 'text-red-500')}>
          {optimisticCount >= 1000
            ? `${(optimisticCount / 1000).toFixed(1)}k`
            : optimisticCount}
        </span>
      )}
    </button>
  );
}
