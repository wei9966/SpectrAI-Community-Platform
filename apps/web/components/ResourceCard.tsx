import Link from "next/link";
import { Download, Heart, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { getResourceTypeLabel, getResourceTypeVariant } from "@/lib/mock-data";
import type { PublicResource } from "@spectrai-community/shared";

interface ResourceCardProps {
  resource: PublicResource;
}

export function ResourceCard({ resource }: ResourceCardProps) {
  const variant = getResourceTypeVariant(resource.type);
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
        return `${interval}${unit === 'year' ? '年' : unit === 'month' ? '个月' : unit === 'week' ? '周' : unit === 'day' ? '天' : unit === 'hour' ? '小时' : '分钟'}前`;
      }
    }
    return '刚刚';
  };

  return (
    <Card className="group hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <Badge variant={variant as any} className="text-xs">
            {getResourceTypeLabel(resource.type)}
          </Badge>
          <span className="text-xs text-muted-foreground">{timeAgo(resource.updatedAt)}</span>
        </div>
        <Link href={`/resource/${resource.id}`}>
          <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
            {resource.name}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {resource.description ?? ''}
        </p>
      </CardHeader>
      <CardContent className="pb-3">
        {/* 标签 */}
        <div className="flex flex-wrap gap-1.5">
          {(resource.tags ?? []).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
          {(resource.tags ?? []).length > 3 && (
            <span className="text-xs px-2 py-0.5 text-muted-foreground">
              +{(resource.tags ?? []).length - 3}
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-3 border-t border-border/40">
        <div className="flex items-center justify-between w-full">
          {/* 作者信息 */}
          <Link
            href={`/user/${resource.author.username}`}
            className="flex items-center gap-2 group/author"
          >
            {resource.author.avatarUrl && (
              <img
                src={resource.author.avatarUrl}
                alt={resource.author.username}
                className="w-6 h-6 rounded-full"
              />
            )}
            <span className="text-xs text-muted-foreground group-hover/author:text-primary transition-colors">
              {resource.author.username}
            </span>
          </Link>

          {/* 统计数据 */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Download className="w-3.5 h-3.5" />
              {resource.downloads >= 1000
                ? `${(resource.downloads / 1000).toFixed(1)}k`
                : resource.downloads}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              {resource.likes >= 1000
                ? `${(resource.likes / 1000).toFixed(1)}k`
                : resource.likes}
            </span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
