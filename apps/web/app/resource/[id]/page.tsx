"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Download, Heart, Calendar, Tag, User, Code, CheckCircle2, Star, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CommentSection } from "@/components/CommentSection";
import { StarRating } from "@/components/star-rating";
import { FavoriteButton } from "@/components/favorite-button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// Inline type label/variant maps (replaces mock-data helpers)
const typeLabels: Record<string, string> = {
  team: 'Team',
  workflow: '工作流',
  skill: 'Skill',
  mcp: 'MCP Server',
};
const typeVariants: Record<string, string> = {
  team: 'default',
  workflow: 'secondary',
  skill: 'outline',
  mcp: 'destructive',
};

interface ResourceData {
  id: string;
  name: string;
  description: string;
  type: string;
  tags: string[];
  version: string;
  downloads: number;
  likes: number;
  isPublished: boolean;
  content: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  averageRating: string;
  ratingCount: number;
  isFavorited: boolean;
  userRating: number | null;
}

interface CommentData {
  id: string;
  content: string;
  userId: string;
  createdAt: string;
  author: {
    username: string;
    avatarUrl: string | null;
  };
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
  }
  return headers;
}

// ---- Loading skeleton ----
function ResourceDetailSkeleton() {
  return (
    <div className="container py-8 md:py-12 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-6 w-20 bg-muted rounded" />
              <div className="h-4 w-12 bg-muted rounded" />
            </div>
            <div className="h-10 w-3/4 bg-muted rounded mb-4" />
            <div className="h-5 w-full bg-muted rounded mb-2" />
            <div className="h-5 w-2/3 bg-muted rounded mb-6" />
            <div className="flex gap-2 mb-6">
              <div className="h-6 w-16 bg-muted rounded" />
              <div className="h-6 w-16 bg-muted rounded" />
              <div className="h-6 w-16 bg-muted rounded" />
            </div>
            <div className="flex gap-4">
              <div className="h-11 w-40 bg-muted rounded" />
              <div className="h-11 w-32 bg-muted rounded" />
            </div>
          </div>
          <Card>
            <CardHeader className="pb-3">
              <div className="h-5 w-24 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-4 w-full bg-muted rounded" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="h-5 w-20 bg-muted rounded" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-16 w-full bg-muted rounded" />
              <div className="h-16 w-full bg-muted rounded" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 w-24 bg-muted rounded" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-3/4 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ResourceDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [resource, setResource] = React.useState<ResourceData | null>(null);
  const [comments, setComments] = React.useState<CommentData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [isLiked, setIsLiked] = React.useState(false);
  const [likesCount, setLikesCount] = React.useState(0);
  const [isInstalling, setIsInstalling] = React.useState(false);
  const [showJsonPreview, setShowJsonPreview] = React.useState(false);

  const [userRating, setUserRating] = React.useState(0);
  const [isFavorited, setIsFavorited] = React.useState(false);
  const [averageRating, setAverageRating] = React.useState(0);
  const [ratingCount, setRatingCount] = React.useState(0);
  const [showSpectrAIHint, setShowSpectrAIHint] = React.useState(false);

  // Fetch resource + comments on mount
  React.useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const headers = getAuthHeaders();

        const [resourceRes, commentsRes] = await Promise.all([
          fetch(`${API_BASE}/api/resources/${id}`, { headers }),
          fetch(`${API_BASE}/api/resources/${id}/comments`, { headers }),
        ]);

        if (!resourceRes.ok) {
          if (resourceRes.status === 404) {
            throw new Error('NOT_FOUND');
          }
          throw new Error(`Failed to fetch resource (${resourceRes.status})`);
        }

        const resourceJson = await resourceRes.json();
        const commentsJson = await commentsRes.json();

        if (cancelled) return;

        // Handle resource – API may return { success, data } or raw object
        const resData: ResourceData = resourceJson.data ?? resourceJson;
        setResource(resData);
        setLikesCount(resData.likes ?? 0);
        setIsFavorited(resData.isFavorited ?? false);
        setUserRating(resData.userRating ?? 0);
        setAverageRating(parseFloat(String(resData.averageRating)) || 0);
        setRatingCount(resData.ratingCount ?? 0);

        // Handle comments
        if (commentsJson.success && commentsJson.data?.items) {
          setComments(commentsJson.data.items);
        } else if (Array.isArray(commentsJson.data)) {
          setComments(commentsJson.data);
        } else if (Array.isArray(commentsJson)) {
          setComments(commentsJson);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message ?? 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [id]);

  // ---- Handlers ----

  const handleRatingChange = async (rating: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/resources/${id}/rate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ rating }),
      });
      if (res.ok) {
        const data = await res.json();
        setUserRating(rating);
        // Update average if the server returns it
        if (data.averageRating !== undefined) {
          setAverageRating(parseFloat(String(data.averageRating)) || averageRating);
        }
        if (data.ratingCount !== undefined) {
          setRatingCount(data.ratingCount);
        }
      }
    } catch (err) {
      console.error("Failed to submit rating:", err);
    }
  };

  const handleFavoriteToggle = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/resources/${id}/favorite`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setIsFavorited((prev) => !prev);
        return true;
      }
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
    return false;
  };

  const handleLike = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/resources/${id}/like`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setIsLiked((prev) => {
          const next = !prev;
          setLikesCount((c) => c + (next ? 1 : -1));
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to like:", err);
    }
  };

  const handleDownload = async () => {
    if (!resource) return;
    setIsInstalling(true);
    try {
      const res = await fetch(`${API_BASE}/api/resources/${id}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.name || resource.name}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Failed to download:", err);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleInstallToSpectrAI = () => {
    if (!resource) return;
    // 尝试 Deep Link
    const deepLink = `spectrai://install/${resource.type}/${id}`;
    window.location.href = deepLink;
    // 设置 2 秒超时，检测是否跳转成功
    setTimeout(() => {
      // 如果没有离开页面，显示提示
      if (!document.hidden) {
        setShowSpectrAIHint(true);
      }
    }, 2000);
  };

  const handleAddComment = async (content: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/resources/${id}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const json = await res.json();
        const newComment = json.data ?? json;
        setComments((prev) => [newComment, ...prev]);
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const timeAgo = (date: string | Date) => {
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

  // ---- Loading state ----
  if (isLoading) {
    return <ResourceDetailSkeleton />;
  }

  // ---- Error state ----
  if (error) {
    const isNotFound = error === 'NOT_FOUND';
    return (
      <div className="container py-16 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-2xl font-bold mb-4">
          {isNotFound ? '资源不存在' : '加载失败'}
        </h1>
        <p className="text-muted-foreground mb-8">
          {isNotFound ? '该资源可能已被删除或移动' : `请稍后重试: ${error}`}
        </p>
        <Link href="/marketplace">
          <Button>返回市场</Button>
        </Link>
      </div>
    );
  }

  // ---- Not found (no resource after loading) ----
  if (!resource) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">资源不存在</h1>
        <p className="text-muted-foreground mb-8">
          该资源可能已被删除或移动
        </p>
        <Link href="/marketplace">
          <Button>返回市场</Button>
        </Link>
      </div>
    );
  }

  const typeLabel = typeLabels[resource.type] || resource.type;
  const variant = typeVariants[resource.type] || 'default';

  // Map API comment shape to PublicComment shape expected by CommentSection
  const mappedComments = comments.map((c) => ({
    id: c.id,
    resourceId: resource.id,
    user: {
      id: c.user?.id ?? c.userId ?? '',
      username: c.user?.username ?? 'Unknown',
      avatarUrl: c.user?.avatarUrl ?? null,
    },
    content: c.content,
    createdAt: new Date(c.createdAt),
  }));

  return (
    <div className="container py-8 md:py-12">
      {/* 安装提示弹窗 */}
      {showSpectrAIHint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 max-w-md mx-4 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-6 h-6 text-purple-500" />
              <h3 className="text-lg font-semibold">未检测到 SpectrAI 客户端</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              请先安装 SpectrAI 桌面端，然后再尝试安装此资源。
            </p>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowSpectrAIHint(false)}>
                知道了
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 资源头部 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* 主要信息 */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Badge variant={variant as any}>{typeLabel}</Badge>
              <span className="text-sm text-muted-foreground">v{resource.version}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{resource.name}</h1>
            <p className="text-lg text-muted-foreground mb-6">{resource.description ?? ''}</p>

            {/* 标签 */}
            <div className="flex flex-wrap gap-2 mb-6">
              {(resource.tags ?? []).map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  <Tag className="w-3 h-3" />
                  {tag}
                </Badge>
              ))}
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-4">
              <Button variant="gradient" size="lg" onClick={handleDownload} disabled={isInstalling}>
                <Download className="w-4 h-4 mr-2" />
                {isInstalling ? "下载中..." : "下载 / 安装"}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleInstallToSpectrAI}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:opacity-90"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                安装到 SpectrAI
              </Button>
              <Button
                variant={isLiked ? "default" : "outline"}
                size="lg"
                onClick={handleLike}
              >
                <Heart className={`w-4 h-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
                喜欢 ({likesCount})
              </Button>
            </div>
          </div>

          {/* JSON 内容预览 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  <h3 className="font-semibold">配置预览</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowJsonPreview(!showJsonPreview)}
                >
                  {showJsonPreview ? "收起" : "展开"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showJsonPreview ? (
                <pre className="bg-secondary/50 rounded-md p-4 overflow-x-auto text-sm font-mono">
                  <code>{JSON.stringify(resource.content, null, 2)}</code>
                </pre>
              ) : (
                <div className="text-sm text-muted-foreground">
                  点击"展开"查看完整的 JSON 配置内容
                </div>
              )}
            </CardContent>
          </Card>

          {/* 评论区 */}
          <CommentSection
            comments={mappedComments}
            resourceId={resource.id}
            onAddComment={handleAddComment}
          />
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          {/* 统计信息 */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">资源统计</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">平均评分</span>
                <span className="font-medium flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  {averageRating.toFixed(1)} ({ratingCount})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">下载数</span>
                <span className="font-medium flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  {resource.downloads.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">喜欢数</span>
                <span className="font-medium flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  {likesCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">更新时间</span>
                <span className="font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {timeAgo(resource.updatedAt)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 评分区域 */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">我的评分</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-2">
                <StarRating
                  value={userRating || averageRating}
                  size="lg"
                  onChange={handleRatingChange}
                />
                <p className="text-sm text-muted-foreground">
                  {userRating > 0 ? `您评分：${userRating} 星` : '点击星星评分'}
                </p>
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">收藏资源</span>
                  <FavoriteButton
                    isFavorited={isFavorited}
                    onToggle={handleFavoriteToggle}
                    size="md"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 作者信息 */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">作者信息</h3>
            </CardHeader>
            <CardContent>
              <Link
                href={`/user/${resource.author.username}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                {resource.author.avatarUrl && (
                  <img
                    src={resource.author.avatarUrl}
                    alt={resource.author.username}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium">{resource.author.username}</p>
                  <p className="text-xs text-muted-foreground">点击查看主页</p>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* 安装说明 */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                安装说明
              </h3>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>1. 点击"下载 / 安装"按钮</p>
              <p>2. 文件将保存到本地配置目录</p>
              <p>3. 在 SpectrAI 桌面端中导入使用</p>
              <p className="text-xs mt-4 pt-4 border-t border-border">
                提示：需要安装 SpectrAI 桌面端才能使用此资源
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
