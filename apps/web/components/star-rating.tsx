'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  /** 当前评分（1-5） */
  value?: number;
  /** 只读模式（显示均分） */
  readOnly?: boolean;
  /** 评分数量 */
  count?: number;
  /** 尺寸大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示评分数量 */
  showCount?: boolean;
  /** 评分变化回调（可编辑模式） */
  onChange?: (rating: number) => void;
  /** className */
  className?: string;
}

export function StarRating({
  value = 0,
  readOnly = false,
  count,
  size = 'md',
  showCount = false,
  onChange,
  className,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = React.useState(0);
  const [animationStar, setAnimationStar] = React.useState<number | null>(null);

  const sizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const displayValue = hoverValue || value;

  const handleClick = (starValue: number) => {
    if (readOnly) return;
    setAnimationStar(starValue);
    setTimeout(() => setAnimationStar(null), 300);
    onChange?.(starValue);
  };

  const handleMouseEnter = (starValue: number) => {
    if (readOnly) return;
    setHoverValue(starValue);
  };

  const handleMouseLeave = () => {
    if (readOnly) return;
    setHoverValue(0);
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* 星星 */}
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= displayValue;
          const isAnimated = animationStar === star;

          return (
            <button
              key={star}
              type="button"
              disabled={readOnly}
              onClick={() => handleClick(star)}
              onMouseEnter={() => handleMouseEnter(star)}
              onMouseLeave={handleMouseLeave}
              className={cn(
                'relative transition-all duration-150',
                readOnly
                  ? 'cursor-default'
                  : 'cursor-pointer hover:scale-110 active:scale-95',
                isAnimated && 'animate-bounce'
              )}
              aria-label={`评分 ${star} 星`}
            >
              <Star
                className={cn(
                  sizes[size],
                  'transition-colors duration-150',
                  isFilled
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-transparent text-muted-foreground/30',
                  !readOnly && 'hover:text-yellow-400'
                )}
              />
              {/* 半星遮罩效果 */}
              {!readOnly && hoverValue > 0 && star === Math.ceil(hoverValue) && hoverValue % 1 !== 0 && (
                <Star
                  className={cn(
                    sizes[size],
                    'absolute inset-0 fill-transparent text-muted-foreground/30'
                  )}
                  style={{ clipPath: 'inset(0 50% 0 0)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 评分数值 */}
      {value > 0 && (
        <span className={cn(textSizes[size], 'font-medium text-foreground ml-1')}>
          {value.toFixed(1)}
        </span>
      )}

      {/* 评分数量 */}
      {showCount && count !== undefined && (
        <span className={cn(textSizes[size], 'text-muted-foreground')}>
          ({count.toLocaleString()})
        </span>
      )}
    </div>
  );
}
