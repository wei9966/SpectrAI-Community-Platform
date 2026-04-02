"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import {
  Calendar,
  FileText,
  Heart,
  Download,
  Star,
  Clock,
  MessageSquare,
  Bookmark,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ResourceCard } from "@/components/ResourceCard";
import { Pagination } from "@/components/Pagination";
import { StarRating } from "@/components/star-rating";
import { cn } from "@/lib/utils";
import type { PublicResource, PublicComment } from "@spectrai-community/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserProfile {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  resourceCount: number;
}

interface UserStats {
  totalDownloads: number;
  totalLikes: number;
  averageRating: number;
  ratingCount: number;
  resourceCount: number;
}

interface ActivityItem {
  id: string;
  type: "resource" | "like" | "comment" | "rating" | "favorite";
  title: string;
  description: string;
  timestamp: string;
  resourceId?: string;
}

interface PaginatedResources {
  items: PublicResource[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) {
      headers["Authorization"] = "Bearer " + token;
    }
  }
  return headers;
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`API ${path} responded with ${res.status}`);
  }
  const json = await res.json();
  if (json.success === false) {
    throw new Error(json.error || `API ${path} failed`);
  }
  return (json.data !== undefined ? json.data : json) as T;
}

// ---------------------------------------------------------------------------
// Time formatting (Chinese)
// ---------------------------------------------------------------------------

function timeAgo(date: string | Date): string {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );
  const intervals: [string, number][] = [
    ["年", 31536000],
    ["月", 2592000],
    ["天", 86400],
    ["小时", 3600],
    ["分钟", 60],
  ];
  for (const [label, secs] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count}${label}前`;
  }
  return "刚刚";
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Activity icon helper
// ---------------------------------------------------------------------------

function getActivityIcon(type: ActivityItem["type"]) {
  switch (type) {
    case "resource":
      return <FileText className="w-4 h-4 text-blue-500" />;
    case "like":
      return <Heart className="w-4 h-4 text-red-500" />;
    case "comment":
      return <MessageSquare className="w-4 h-4 text-green-500" />;
    case "rating":
      return <Star className="w-4 h-4 text-yellow-500" />;
    case "favorite":
      return <Bookmark className="w-4 h-4 text-purple-500" />;
  }
}

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/60", className)}
    />
  );
}

function ProfileSkeleton() {
  return (
    <div className="container py-8 md:py-12">
      {/* Header skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <SkeletonBlock className="w-24 h-24 rounded-full mx-auto" />
              <SkeletonBlock className="h-6 w-32 mx-auto" />
              <SkeletonBlock className="h-4 w-48 mx-auto" />
              <SkeletonBlock className="h-4 w-24 mx-auto" />
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <SkeletonBlock className="h-5 w-20" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-20 rounded-lg" />
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <SkeletonBlock className="h-5 w-40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity skeleton */}
      <Card className="mb-8">
        <CardHeader>
          <SkeletonBlock className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4">
              <SkeletonBlock className="w-8 h-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonBlock className="h-4 w-48" />
                <SkeletonBlock className="h-3 w-64" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tabs skeleton */}
      <div className="flex border-b border-border mb-6 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-9 w-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-52 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;

  // ---- Core state ----
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [stats, setStats] = React.useState<UserStats | null>(null);
  const [activities, setActivities] = React.useState<ActivityItem[]>([]);
  const [resources, setResources] = React.useState<PublicResource[]>([]);
  const [resourceTotal, setResourceTotal] = React.useState(0);
  const [resourceTotalPages, setResourceTotalPages] = React.useState(1);
  const [likedResources, setLikedResources] = React.useState<PublicResource[]>([]);
  const [comments, setComments] = React.useState<PublicComment[]>([]);

  // ---- UI state ----
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState("resources");
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 6;

  // --------------------------------------------------------------------
  // Step 1: Fetch user profile by username
  // Step 2: Once we have the user ID, fetch everything else in parallel
  // --------------------------------------------------------------------

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // Step 1 -- get the user profile by username
        const profile = await apiFetch<UserProfile>(
          `/api/users/${encodeURIComponent(username)}`
        );

        if (cancelled) return;
        setUser(profile);

        // Step 2 -- parallel fetches that need the user id
        const userId = profile.id;

        const results = await Promise.allSettled([
            apiFetch<UserStats>(`/api/users/${userId}/stats`),
            apiFetch<ActivityItem[]>(`/api/users/${userId}/activity`),
            apiFetch<PaginatedResources>(
              `/api/users/${encodeURIComponent(username)}/resources?page=1&limit=${itemsPerPage}`
            ),
            apiFetch<PublicResource[]>(`/api/users/${userId}/likes`),
            apiFetch<PublicComment[]>(`/api/users/${userId}/comments`),
          ]);

        if (cancelled) return;

        if (results[0].status === "fulfilled") setStats(results[0].value);
        if (results[1].status === "fulfilled") setActivities(Array.isArray(results[1].value) ? results[1].value : []);
        if (results[2].status === "fulfilled") {
          const rd = results[2].value;
          const author = { id: profile.id, username: profile.username, avatarUrl: profile.avatarUrl };
          setResources((rd?.items || []).map((r: any) => ({ ...r, author: r.author || author })));
          setResourceTotal(rd?.pagination?.total || 0);
          setResourceTotalPages(rd?.pagination?.totalPages || 1);
        }
        if (results[3].status === "fulfilled") {
          const lv = results[3].value;
          setLikedResources(Array.isArray(lv) ? lv : (lv as any)?.items || []);
        }
        if (results[4].status === "fulfilled") setComments(Array.isArray(results[4].value) ? results[4].value : []);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "加载用户信息失败，请稍后重试"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [username]);

  // ---- Paginate resources on page change ----

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function fetchPage() {
      try {
        const data = await apiFetch<PaginatedResources>(
          `/api/users/${encodeURIComponent(username)}/resources?page=${currentPage}&limit=${itemsPerPage}`
        );
        if (!cancelled) {
          const author = { id: user.id, username: user.username, avatarUrl: user.avatarUrl };
          setResources((data.items || []).map((r: any) => ({ ...r, author: r.author || author })));
          setResourceTotal(data.pagination.total);
          setResourceTotalPages(data.pagination.totalPages);
        }
      } catch {
        // keep existing data on pagination failure
      }
    }

    // skip initial fetch (already done in the main effect)
    if (currentPage !== 1 || resources.length === 0) {
      fetchPage();
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // ---- Derived values ----
  const memberDays = user
    ? Math.floor(
        (Date.now() - new Date(user.createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  // ------------------------------------------------------------------
  // Loading state
  // ------------------------------------------------------------------
  if (loading) {
    return <ProfileSkeleton />;
  }

  // ------------------------------------------------------------------
  // Error state
  // ------------------------------------------------------------------
  if (error) {
    return (
      <div className="container py-16 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
        <h1 className="text-2xl font-bold mb-2">加载失败</h1>
        <p className="text-muted-foreground mb-8">{error}</p>
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            重试
          </Button>
          <Link href="/marketplace">
            <Button>返回市场</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Not-found state
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="container py-8 md:py-12">
      {/* ========== Header: profile card + stats ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
        {/* Profile card */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="text-center">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
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
                <p className="text-sm text-muted-foreground mb-4">
                  {user.bio}
                </p>
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

        {/* Stats panel */}
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
                  <div className="text-xl font-bold">
                    {user.resourceCount}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Download className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">总下载数</div>
                  <div className="text-xl font-bold">
                    {(stats?.totalDownloads ?? 0).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Heart className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">总获赞</div>
                  <div className="text-xl font-bold">
                    {(stats?.totalLikes ?? 0).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Star className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">平均评分</div>
                  <div className="flex items-center gap-1">
                    <span className="text-xl font-bold">
                      {(stats?.averageRating ?? 0).toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({stats?.ratingCount ?? 0}人)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Star rating display */}
            <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
              <span className="text-sm text-muted-foreground">综合评分：</span>
              <StarRating value={stats?.averageRating ?? 0} size="sm" readOnly />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========== Activity timeline ========== */}
      <Card className="mb-8">
        <CardHeader>
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            活动时间线
          </h3>
        </CardHeader>
        <CardContent>
          {activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity, index) => (
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
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                    {activity.resourceId && (
                      <Link
                        href={`/resource/${activity.resourceId}`}
                        className="text-sm text-primary hover:underline mt-1 inline-block"
                      >
                        查看资源
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              暂无活动记录
            </p>
          )}
        </CardContent>
      </Card>

      {/* ========== Tabs ========== */}
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
              {resourceTotal}
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
              {comments.length}
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
          </TabsPrimitive.Trigger>
        </TabsPrimitive.List>

        {/* ---- Resources tab ---- */}
        <TabsPrimitive.Content value="resources">
          {resources.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {resources.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>

              {resourceTotalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={resourceTotalPages}
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

        {/* ---- Likes tab ---- */}
        <TabsPrimitive.Content value="likes">
          {likedResources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {likedResources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  showRating={false}
                />
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

        {/* ---- Comments tab ---- */}
        <TabsPrimitive.Content value="comments">
          {comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <Card key={comment.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <Link href={`/user/${comment.user.username}`}>
                        {comment.user.avatarUrl ? (
                          <img
                            src={comment.user.avatarUrl}
                            alt={comment.user.username}
                            className="w-8 h-8 rounded-full object-cover"
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
                        <p className="text-sm text-muted-foreground">
                          {comment.content}
                        </p>
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

        {/* ---- Favorites tab (placeholder, needs dedicated endpoint) ---- */}
        <TabsPrimitive.Content value="favorites">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              暂无收藏记录
            </CardContent>
          </Card>
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>
    </div>
  );
}
