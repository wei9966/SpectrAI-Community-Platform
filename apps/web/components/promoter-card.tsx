"use client";

import * as React from "react";
import { Check, Copy, Crown, Shield, Sparkles, Star, Trophy, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface PromoterCardProps {
  level: number;
  totalInvites: number;
  inviteCode?: string | null;
  nextLevel?: {
    minInvites: number;
    remaining: number;
  } | null;
  rewardInfo?: {
    creditReward?: number;
    vipDaysReward?: number;
    credits?: number;
    vipDays?: number;
  } | null;
  className?: string;
  title?: string;
  description?: string;
}

export const PROMOTER_LEVEL_META = {
  1: {
    label: "铜牌推广者",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    panelClass: "from-amber-500/10 via-transparent to-transparent",
    progressClass: "bg-amber-400",
    icon: Shield,
  },
  2: {
    label: "银牌推广者",
    badgeClass: "bg-slate-400/15 text-slate-200 border-slate-400/30",
    panelClass: "from-slate-300/10 via-transparent to-transparent",
    progressClass: "bg-slate-300",
    icon: Star,
  },
  3: {
    label: "金牌推广者",
    badgeClass: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    panelClass: "from-yellow-500/10 via-transparent to-transparent",
    progressClass: "bg-yellow-400",
    icon: Crown,
  },
  4: {
    label: "铂金推广者",
    badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    panelClass: "from-cyan-500/10 via-transparent to-transparent",
    progressClass: "bg-cyan-400",
    icon: Trophy,
  },
  5: {
    label: "钻石推广者",
    badgeClass: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
    panelClass: "from-fuchsia-500/10 via-transparent to-transparent",
    progressClass: "bg-fuchsia-400",
    icon: Sparkles,
  },
} as const;

export function getPromoterLevelMeta(level: number) {
  const safeLevel = Math.min(Math.max(Math.round(level || 1), 1), 5) as keyof typeof PROMOTER_LEVEL_META;
  return PROMOTER_LEVEL_META[safeLevel];
}

export function PromoterCard({
  level,
  totalInvites,
  inviteCode,
  nextLevel,
  rewardInfo,
  className,
  title = "推广者等级",
  description = "查看当前推广等级、升级进度和邀请码。",
}: PromoterCardProps) {
  const [copied, setCopied] = React.useState(false);
  const levelMeta = getPromoterLevelMeta(level);
  const LevelIcon = levelMeta.icon;
  const creditReward = rewardInfo?.creditReward ?? rewardInfo?.credits ?? 0;
  const vipDaysReward = rewardInfo?.vipDaysReward ?? rewardInfo?.vipDays ?? 0;

  const progress = React.useMemo(() => {
    if (!nextLevel || nextLevel.minInvites <= 0) return 100;
    const completed = Math.max(0, nextLevel.minInvites - nextLevel.remaining);
    return Math.max(0, Math.min(100, (completed / nextLevel.minInvites) * 100));
  }, [nextLevel]);

  const handleCopy = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy invite code:", error);
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className={cn("border-b bg-gradient-to-br", levelMeta.panelClass)}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <Badge variant="outline" className={cn("border", levelMeta.badgeClass)}>
            <LevelIcon className="mr-1 h-3.5 w-3.5" />
            {levelMeta.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-secondary/20 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserPlus className="h-4 w-4" />
              邀请人数
            </div>
            <div className="mt-2 text-2xl font-bold">{totalInvites}</div>
          </div>
          <div className="rounded-lg border border-border bg-secondary/20 p-4">
            <div className="text-sm text-muted-foreground">当前奖励</div>
            <div className="mt-2 text-sm font-medium">积分 +{creditReward}</div>
            <div className="mt-1 text-sm font-medium">会员 {vipDaysReward} 天</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">升级进度</span>
            {nextLevel ? (
              <span className="text-muted-foreground">距离下一等级还差 {Math.max(nextLevel.remaining, 0)} 人</span>
            ) : (
              <span className="text-emerald-400">已达最高等级</span>
            )}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn("h-full rounded-full transition-all", levelMeta.progressClass)}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {nextLevel ? `达到 ${nextLevel.minInvites} 人邀请即可升级到下一等级。` : "当前等级已是最高等级，可持续享受最高奖励。"}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-secondary/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">邀请码</div>
              <p className="text-xs text-muted-foreground">可复制后分享给潜在邀请对象。</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={!inviteCode}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "已复制" : "复制"}
            </Button>
          </div>
          <div className="mt-3 rounded-md bg-background px-3 py-2 font-mono text-sm">
            {inviteCode || "暂未生成邀请码"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}