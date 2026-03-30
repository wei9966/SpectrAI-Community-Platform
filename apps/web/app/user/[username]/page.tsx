"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Calendar, Mail, Github, FileText, Heart, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ResourceCard } from "@/components/ResourceCard";
import { Pagination } from "@/components/Pagination";
import { mockUser, mockResources } from "@/lib/mock-data";
import type { PublicUser, PublicResource } from "@spectrai-community/shared";

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;

  // 实际应用中应该从 API 获取用户数据
  const [user, setUser] = React.useState<PublicUser | null>(mockUser);
  const [userResources, setUserResources] = React.useState<PublicResource[]>(
    mockResources.filter((r) => r.author.username === mockUser.username)
  );
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 6;

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

  const totalDownloads = userResources.reduce((sum, r) => sum + r.downloads, 0);
  const totalLikes = userResources.reduce((sum, r) => sum + r.likes, 0);

  return (
    <div className="container py-8 md:py-12">
      {/* 用户信息头部 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        {/* 个人信息卡片 */}
        <Card className="md:col-span-1">
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
                  加入 {timeAgo(user.createdAt)}
                </div>
              </div>

              {/* 统计数据 */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
                <div className="text-center">
                  <div className="text-lg font-bold">{userResources.length}</div>
                  <div className="text-xs text-muted-foreground">资源</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{totalDownloads.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">下载</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{totalLikes.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">喜欢</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 详细信息 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <h3 className="font-semibold">关于我</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">发布的资源</div>
                  <div className="text-lg font-bold">{userResources.length}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <Download className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">总下载数</div>
                  <div className="text-lg font-bold">{totalDownloads.toLocaleString()}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <Heart className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">总喜欢数</div>
                  <div className="text-lg font-bold">{totalLikes.toLocaleString()}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">加入时间</div>
                  <div className="text-lg font-bold">{timeAgo(user.createdAt)}</div>
                </div>
              </div>
            </div>

            {user.bio && (
              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-medium mb-2">个人简介</h4>
                <p className="text-sm text-muted-foreground">{user.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 用户资源列表 */}
      <div>
        <h2 className="text-2xl font-bold mb-6">发布的资源</h2>

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
      </div>
    </div>
  );
}
