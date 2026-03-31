"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { Calendar, FileText, Heart, Download, Star, Clock, MessageSquare, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ResourceCard } from "@/components/ResourceCard";
import { Pagination } from "@/components/Pagination";
import { StarRating } from "@/components/star-rating";
import { cn } from "@/lib/utils";
import { mockUser, mockResources, mockComments } from "@/lib/mock-data";
import type { PublicUser, PublicResource } from "@spectrai-community/shared";

// 模拟活动时间线数据
interface ActivityItem {
  id: string;
  type: 'resource' | 'like' | 'comment' | 'rating' | 'favorite';
  title: string;
  description: string;
  timestamp: Date;
  resourceId?: string;
}

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'resource',
    title: '发布了新资源',
    description: 'SpectrAI 多会话编排 Workflow',
    timestamp: new Date('2025-03-28T15:30:00Z'),
    resourceId: '1',
  },
  {
    id: '2',
    type: 'rating',
    title: '收到评分',
    description: '您收到了 5 星评分',
    timestamp: new Date('2025-03-27T10:00:00Z'),
    resourceId: '1',
  },
  {
    id: '3',
    type: 'comment',
    title: '收到评论',
    description: 'DevUser123 评论了您的资源',
    timestamp: new Date('2025-03-26T09:00:00Z'),
    resourceId: '1',
  },
  {
    id: '4',
    type: 'like',
    title: '收到点赞',
    description: '您的资源被点赞 +10',
    timestamp: new Date('2025-03-25T14:00:00Z'),
    resourceId: '1',
  },
  {
    id: '5',
    type: 'favorite',
    title: '被收藏',
    description: '您的工作流被收藏到精选集',
    timestamp: new Date('2025-03-24T11:00:00Z'),
    resourceId: '1',
  },
];

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;

  // 状态
  const [user, setUser] = React.useState<PublicUser | null>(mockUser);
  const [userResources, setUserResources] = React.useState<PublicResource[]>(
    mockResources.filter((r) => r.author.username === mockUser.username)
  );
  const [currentPage, setCurrentPage] = React.useState(1);
  const [activeTab, setActiveTab] = React.useState("resources");
  const itemsPerPage = 6;

  // 模拟数据（后续 API 对接后从 props 传入）
  const likedResources = mockResources.slice(0, 3); // 模拟点赞的资源
  const favoritedResources = mockResources.slice(1, 4); // 模拟收藏的资源
  const userComments = mockComments; // 模拟用户的评论
  const totalDownloads = userResources.reduce((sum, r) => sum + r.downloads, 0);
  const totalLikes = userResources.reduce((sum, r) => sum + r.likes, 0);
  const averageRating = 4.5; // 模拟平均评分
  const ratingCount = 42; // 模拟评分人数
  const memberDays = Math.floor((new Date().getTime() - new Date(user?.createdAt || new Date()).getTime()) / (1000 * 60 * 60 * 24));

  const totalPages = Math.ceil(userResources.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedResources = userResources.slice(startIndex, endIndex);

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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'resource':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'rating':
        return <Star className="w-4 h-4 text-yellow-500" />;
      case 'favorite':
        return <Bookmark className="w-4 h-4 text-purple-500" />;
    }
  };

  if (!user) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">用户不存在</h1>
        <p className="text-muted-foreground mb-8">
          该用户可能已被删除或禁用
        </p>
        <Link href="/marketplace">
          <Button>返回市场</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12">
      {/* 用户信息头部 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
        {/* 个人信息卡片 */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="text-center">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-24 h-24 rounded-full mx-auto mb-4"
                />
              ) : (
                <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-gradient-primary flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              <h1 className="text-xl font-bold mb-2">{user.username}</h1>

              {user.bio && (
                <p className="text-sm text-muted-foreground mb-4">{user.bio}</p>
              )}

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <Calendar className="w-4 h-4" />
                  加入 {memberDays} 天
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 统计面板 */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <h3 className="font-semibold">数据统计</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">发布的资源</div>
                  <div className="text-xl font-bold">{userResources.length}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Download className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">总下载数</div>
                  <div className="text-xl font-bold">{totalDownloads.toLocaleString()}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Heart className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">总获赞</div>
                  <div className="text-xl font-bold">{totalLikes.toLocaleString()}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Star className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">平均评分</div>
                  <div className="flex items-center gap-1">
                    <span className="text-xl font-bold">{averageRating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">({ratingCount}人)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 简短评分展示 */}
            <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
              <span className="text-sm text-muted-foreground">综合评分：</span>
              <StarRating value={averageRating} size="sm" readOnly />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 活动时间线 */}
      <Card className="mb-8">
        <CardHeader>
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            活动时间线
          </h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockActivities.map((activity, index) => (
              <div key={activity.id} className="flex items-start gap-4">
                <div className="mt-1 p-2 rounded-full bg-secondary">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{activity.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(activity.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                  {activity.resourceId && (
                    <Link
                      href={`/resource/${activity.resourceId}`}
                      className="text-sm text-primary hover:underline mt-1 inline-block"
                    >
                      查看资源
                    </Link>
                  )}
                </div>
                {index < mockActivities.length - 1 && (
                  <div className="absolute left-7 top-10 w-px h-full bg-border/50 -z-10" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs 区域 */}
      <TabsPrimitive.Root value={activeTab} onValueChange={setActiveTab}>
        <TabsPrimitive.List className="flex border-b border-border mb-6">
          <TabsPrimitive.Trigger
            value="resources"
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors relative",
              "text-muted-foreground hover:text-foreground",
              "data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary",
              "-mb-px"
            )}
          >
            <FileText className="w-4 h-4 mr-2 inline" />
            我的资源
            <span className="ml-2 text-xs bg-secondary px-1.5 py-0.5 rounded-full">
              {userResources.length}
            </span>
          </TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger
            value="likes"
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors relative",
              "text-muted-foreground hover:text-foreground",
              "data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary",
              "-mb-px"
            )}
          >
            <Heart className="w-4 h-4 mr-2 inline" />
            点赞
            <span className="ml-2 text-xs bg-secondary px-1.5 py-0.5 rounded-full">
              {likedResources.length}
            </span>
          </TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger
            value="comments"
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors relative",
              "text-muted-foreground hover:text-foreground",
              "data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary",
              "-mb-px"
            )}
          >
            <MessageSquare className="w-4 h-4 mr-2 inline" />
            评论
            <span className="ml-2 text-xs bg-secondary px-1.5 py-0.5 rounded-full">
              {userComments.length}
            </span>
          </TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger
            value="favorites"
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors relative",
              "text-muted-foreground hover:text-foreground",
              "data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary",
              "-mb-px"
            )}
          >
            <Bookmark className="w-4 h-4 mr-2 inline" />
            收藏
            <span className="ml-2 text-xs bg-secondary px-1.5 py-0.5 rounded-full">
              {favoritedResources.length}
            </span>
          </TabsPrimitive.Trigger>
        </TabsPrimitive.List>

        {/* 我的资源 Tab */}
        <TabsPrimitive.Content value="resources">
          {paginatedResources.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {paginatedResources.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>

              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                该用户还没有发布任何资源
              </CardContent>
            </Card>
          )}
        </TabsPrimitive.Content>

        {/* 点赞 Tab */}
        <TabsPrimitive.Content value="likes">
          {likedResources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {likedResources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} showRating={false} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                暂无点赞记录
              </CardContent>
            </Card>
          )}
        </TabsPrimitive.Content>

        {/* 评论 Tab */}
        <TabsPrimitive.Content value="comments">
          {userComments.length > 0 ? (
            <div className="space-y-4">
              {userComments.map((comment) => (
                <Card key={comment.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <Link href={`/user/${comment.user.username}`}>
                        {comment.user.avatarUrl ? (
                          <img
                            src={comment.user.avatarUrl}
                            alt={comment.user.username}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                            <span className="text-white text-sm font-bold">
                              {comment.user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </Link>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={`/user/${comment.user.username}`}
                            className="font-medium hover:text-primary"
                          >
                            {comment.user.username}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {timeAgo(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{comment.content}</p>
                        <Link
                          href={`/resource/${comment.resourceId}`}
                          className="text-xs text-primary hover:underline mt-2 inline-block"
                        >
                          查看资源
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                暂无评论记录
              </CardContent>
            </Card>
          )}
        </TabsPrimitive.Content>

        {/* 收藏 Tab */}
        <TabsPrimitive.Content value="favorites">
          {favoritedResources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoritedResources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                暂无收藏记录
              </CardContent>
            </Card>
          )}
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>
    </div>
  );
}
