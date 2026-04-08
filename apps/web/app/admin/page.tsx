"use client";

import * as React from "react";
import {
  adminStatsApi,
  type OverviewStats,
  type TopResource,
  type TopUser,
  type TrendsData,
  type ResourcesByType,
} from "@/lib/admin/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Package,
  MessageSquare,
  FileText,
  TrendingUp,
  Clock,
  Loader2,
  AlertCircle,
  Download,
  Heart,
} from "lucide-react";
import { TrendChart } from "@/lib/admin/trend-chart";
import { DistributionChart } from "@/lib/admin/distribution-chart";

function StatCard({
  title,
  value,
  today,
  icon: Icon,
}: {
  title: string;
  value: number;
  today?: number;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {today !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">
            <span className="text-emerald-500">+{today}</span> 今日新增
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function TopResourcesTable({ items }: { items: TopResource[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">热门资源 (按下载量)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((r, i) => (
            <div key={r.id} className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-5 text-right">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{r.name}</div>
                <div className="text-xs text-muted-foreground">
                  {r.type} · {r.authorUsername ?? "unknown"}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  {r.downloads}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {r.likes}
                </span>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">暂无数据</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TopUsersTable({ items }: { items: TopUser[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">活跃用户 (按资源数)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((u, i) => (
            <div key={u.userId} className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-5 text-right">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{u.username}</div>
              </div>
              <div className="text-xs text-muted-foreground shrink-0">
                {u.resourceCount} 个资源
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">暂无数据</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const [overview, setOverview] = React.useState<OverviewStats | null>(null);
  const [topResources, setTopResources] = React.useState<TopResource[]>([]);
  const [topUsers, setTopUsers] = React.useState<TopUser[]>([]);
  const [trends, setTrends] = React.useState<TrendsData | null>(null);
  const [dist, setDist] = React.useState<ResourcesByType | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function load() {
      try {
        const [ov, tr, tu, trend, distData] = await Promise.all([
          adminStatsApi.overview(),
          adminStatsApi.topResources("downloads", 5),
          adminStatsApi.topUsers("resources", 5),
          adminStatsApi.trends(30),
          adminStatsApi.resourcesByType(),
        ]);
        setOverview(ov);
        setTopResources(tr);
        setTopUsers(tu);
        setTrends(trend);
        setDist(distData);
      } catch (e: any) {
        setError(e.message || "加载失败");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  const typeDist = dist?.byType.map((t) => ({ name: t.type, value: t.total })) ?? [];
  const statusDist = dist?.byReviewStatus.map((s) => ({ name: s.status, value: s.total })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">仪表盘</h1>
        <p className="text-muted-foreground text-sm mt-1">社区数据概览</p>
      </div>

      {/* Overview cards */}
      {overview && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="总用户数"
              value={overview.totals.users}
              today={overview.today.newUsers}
              icon={Users}
            />
            <StatCard
              title="总资源数"
              value={overview.totals.resources}
              today={overview.today.newResources}
              icon={Package}
            />
            <StatCard
              title="论坛帖子"
              value={overview.totals.forumPosts}
              today={overview.today.newPosts}
              icon={MessageSquare}
            />
            <StatCard
              title="总评论数"
              value={overview.totals.comments}
              icon={FileText}
            />
          </div>

          {/* Secondary stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  已发布资源
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{overview.resources.published}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  待审核资源
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-amber-500">
                  {overview.resources.pendingReview}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Trend chart */}
      {trends && (
        <TrendChart
          title="最近 30 天趋势"
          users={trends.users}
          resources={trends.resources}
          forumPosts={trends.forumPosts}
        />
      )}

      {/* Distribution charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DistributionChart title="资源类型分布" data={typeDist} />
        <DistributionChart
          title="审核状态分布"
          data={statusDist}
          colors={[
            "hsl(38, 92%, 50%)",  // pending - amber
            "hsl(142, 71%, 45%)", // approved - green
            "hsl(0, 72%, 51%)",   // rejected - red
            "hsl(215, 20.2%, 65.1%)", // draft - muted
          ]}
        />
      </div>

      {/* Top lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopResourcesTable items={topResources} />
        <TopUsersTable items={topUsers} />
      </div>
    </div>
  );
}
