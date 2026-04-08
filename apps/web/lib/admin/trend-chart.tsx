"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrendPoint } from "@/lib/admin/api";

interface TrendChartProps {
  title: string;
  users: TrendPoint[];
  resources: TrendPoint[];
  forumPosts: TrendPoint[];
}

// Merge all dates into a single dataset
function mergeTrendData(
  users: TrendPoint[],
  resources: TrendPoint[],
  forumPosts: TrendPoint[]
) {
  const dateMap = new Map<string, { date: string; users: number; resources: number; forumPosts: number }>();

  for (const p of users) {
    const key = p.date.slice(5); // "MM-DD"
    dateMap.set(key, { date: key, users: p.count, resources: 0, forumPosts: 0 });
  }
  for (const p of resources) {
    const key = p.date.slice(5);
    const existing = dateMap.get(key);
    if (existing) {
      existing.resources = p.count;
    } else {
      dateMap.set(key, { date: key, users: 0, resources: p.count, forumPosts: 0 });
    }
  }
  for (const p of forumPosts) {
    const key = p.date.slice(5);
    const existing = dateMap.get(key);
    if (existing) {
      existing.forumPosts = p.count;
    } else {
      dateMap.set(key, { date: key, users: 0, resources: 0, forumPosts: p.count });
    }
  }

  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function TrendChart({ title, users, resources, forumPosts }: TrendChartProps) {
  const data = React.useMemo(
    () => mergeTrendData(users, resources, forumPosts),
    [users, resources, forumPosts]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              暂无趋势数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorResources" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorForum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217.2, 32.6%, 17.5%)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "hsl(215, 20.2%, 65.1%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(215, 20.2%, 65.1%)" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222.2, 84%, 4.9%)",
                    border: "1px solid hsl(217.2, 32.6%, 17.5%)",
                    borderRadius: "0.5rem",
                    fontSize: "0.8rem",
                  }}
                  labelStyle={{ color: "hsl(210, 40%, 98%)" }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "0.75rem", paddingTop: "0.5rem" }}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  name="新用户"
                  stroke="hsl(262, 83%, 58%)"
                  fill="url(#colorUsers)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="resources"
                  name="新资源"
                  stroke="hsl(142, 71%, 45%)"
                  fill="url(#colorResources)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="forumPosts"
                  name="新帖子"
                  stroke="hsl(38, 92%, 50%)"
                  fill="url(#colorForum)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
