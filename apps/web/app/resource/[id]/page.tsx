"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Download, Heart, Calendar, Tag, User, Code, CheckCircle2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CommentSection } from "@/components/CommentSection";
import { StarRating } from "@/components/star-rating";
import { FavoriteButton } from "@/components/favorite-button";
import { mockResources, mockComments, getResourceTypeLabel, getResourceTypeVariant } from "@/lib/mock-data";
import { api } from "@/lib/api";

export default function ResourceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [resource, setResource] = React.useState(mockResources.find((r) => r.id === id) || null);
  const [comments, setComments] = React.useState(mockComments);
  const [isLiked, setIsLiked] = React.useState(false);
  const [isInstalling, setIsInstalling] = React.useState(false);
  const [showJsonPreview, setShowJsonPreview] = React.useState(false);

  // 评分相关状态（后续 API 对接后从 props 传入）
  const [userRating, setUserRating] = React.useState(0); // 当前用户评分
  const [isFavorited, setIsFavorited] = React.useState(false);
  // 模拟评分数据
  const averageRating = (resource as any).averageRating ?? 4.2;
  const ratingCount = (resource as any).ratingCount ?? 128;

  const handleRatingChange = async (rating: number) => {
    // TODO: API 对接后调用 POST /api/resources/:id/rate
    console.log("Rating submitted:", rating);
    setUserRating(rating);
  };

  const handleFavoriteToggle = async () => {
    // TODO: API 对接后调用 POST /api/resources/:id/favorite
    console.log("Favorite toggled");
    setIsFavorited(!isFavorited);
    return true;
  };

  const handleLike = async () => {
    try {
      const result = await api.likeResource(id);
      if (result.success) {
        setIsLiked(!isLiked);
      }
    } catch (error) {
      console.error("Failed to like:", error);
    }
  };

  const handleDownload = async () => {
    setIsInstalling(true);
    try {
      // 注意：后端没有专门的文件下载接口
      // 实际应用中应该直接获取资源内容并触发浏览器下载
      // 这里调用 resourcesApi.getById 获取资源数据
      const result = await api.getResource(id);
      if (result.success && result.data) {
        // 演示：将资源配置作为 JSON 文件下载
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${result.data.name}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to download:", error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleAddComment = async (content: string) => {
    // 实际应用中调用 API
    console.log("Adding comment:", content);
  };

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

  const variant = getResourceTypeVariant(resource.type);

  return (
    <div className="container py-8 md:py-12">
      {/* 资源头部 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* 主要信息 */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Badge variant={variant as any}>{getResourceTypeLabel(resource.type)}</Badge>
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
                variant={isLiked ? "default" : "outline"}
                size="lg"
                onClick={handleLike}
              >
                <Heart className={`w-4 h-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
                喜欢 ({resource.likes + (isLiked ? 1 : 0)})
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
            comments={comments}
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
                  {resource.likes.toLocaleString()}
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
