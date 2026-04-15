"use client";

import * as React from "react";
import {
  adminPromoterApi,
  type PromoterDetail,
  type PromoterListItem,
  type PromoterListResponse,
  type PromoterRewardHistoryItem,
} from "@/lib/admin/api";
import { PromoterCard, getPromoterLevelMeta } from "@/components/promoter-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/lib/admin/confirm-dialog";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Megaphone,
  RefreshCcw,
  Search,
  X,
} from "lucide-react";

const PAGE_SIZE = 10;

function normalizePromoter(raw: any): PromoterListItem {
  return {
    userId: String(raw?.userId ?? raw?.id ?? raw?.user?.id ?? raw?.promoterId ?? ""),
    username: raw?.username ?? raw?.user?.username ?? raw?.promoterUsername ?? "未命名用户",
    level: Number(raw?.level ?? raw?.promoterLevel ?? raw?.currentLevel ?? 1),
    totalInvites: Number(raw?.totalInvites ?? raw?.inviteCount ?? raw?.totalInvitees ?? raw?.stats?.totalInvites ?? 0),
    totalCredits: Number(raw?.totalCredits ?? raw?.creditTotal ?? raw?.totalRewardCredits ?? raw?.stats?.totalCredits ?? 0),
    inviteCode: raw?.inviteCode ?? raw?.profile?.inviteCode ?? null,
    avatarUrl: raw?.avatarUrl ?? raw?.user?.avatarUrl ?? null,
    updatedAt: raw?.updatedAt ?? raw?.profile?.updatedAt,
  };
}

function normalizeReward(raw: any): PromoterRewardHistoryItem {
  return {
    id: String(raw?.id ?? raw?.rewardId ?? `${raw?.createdAt ?? "reward"}-${raw?.inviteeUsername ?? raw?.invitedUsername ?? "user"}`),
    inviteeUsername: raw?.inviteeUsername ?? raw?.invitedUsername ?? raw?.invitee?.username ?? null,
    creditReward: Number(raw?.creditReward ?? raw?.credits ?? raw?.rewardCredits ?? 0),
    vipDaysReward: Number(raw?.vipDaysReward ?? raw?.daysReward ?? raw?.rewardDays ?? 0),
    status: String(raw?.status ?? "unknown"),
    frozenUntil: raw?.frozenUntil ?? raw?.freezeUntil ?? null,
    createdAt: raw?.createdAt ?? raw?.rewardedAt ?? new Date().toISOString(),
    releasedAt: raw?.releasedAt ?? null,
  };
}

function normalizeDetail(raw: any): PromoterDetail {
  const rewardsSource = Array.isArray(raw?.rewards)
    ? raw.rewards
    : Array.isArray(raw?.rewardHistory)
      ? raw.rewardHistory
      : Array.isArray(raw?.history)
        ? raw.history
        : [];

  const nextLevelSource = raw?.nextLevel ?? (raw?.nextLevelMinInvites
    ? {
        minInvites: raw.nextLevelMinInvites,
        remaining: raw?.nextLevelRemaining ?? raw?.remainingInvites ?? 0,
      }
    : null);

  const rewardInfoSource = raw?.rewardInfo ?? raw?.currentReward ?? null;

  return {
    ...normalizePromoter(raw),
    totalVipDays: Number(raw?.totalVipDays ?? raw?.vipDaysTotal ?? raw?.stats?.totalVipDays ?? 0),
    nextLevel: nextLevelSource
      ? {
          minInvites: Number(nextLevelSource.minInvites ?? 0),
          remaining: Number(nextLevelSource.remaining ?? 0),
        }
      : null,
    rewardInfo: rewardInfoSource
      ? {
          creditReward: Number(rewardInfoSource.creditReward ?? rewardInfoSource.credits ?? 0),
          vipDaysReward: Number(rewardInfoSource.vipDaysReward ?? rewardInfoSource.vipDays ?? 0),
        }
      : null,
    rewards: rewardsSource.map(normalizeReward),
  };
}

function normalizeListResponse(raw: any): PromoterListResponse {
  const itemsSource = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw?.list)
        ? raw.list
        : [];

  const paginationSource = raw?.pagination ?? raw?.pageInfo ?? null;
  const total = Number(paginationSource?.total ?? raw?.total ?? itemsSource.length);
  const limit = Number(paginationSource?.limit ?? raw?.limit ?? PAGE_SIZE);

  return {
    items: itemsSource.map(normalizePromoter),
    pagination: {
      page: Number(paginationSource?.page ?? raw?.page ?? 1),
      limit,
      total,
      totalPages: Number(
        paginationSource?.totalPages
          ?? raw?.totalPages
          ?? Math.max(1, Math.ceil((total || 1) / Math.max(limit, 1)))
      ),
    },
  };
}

function getStatusMeta(status: string) {
  switch (status) {
    case "released":
      return { label: "已释放", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
    case "frozen":
      return { label: "冻结中", className: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
    case "expired":
      return { label: "已过期", className: "bg-slate-500/15 text-slate-300 border-slate-500/30" };
    case "cancelled":
      return { label: "已取消", className: "bg-rose-500/15 text-rose-300 border-rose-500/30" };
    default:
      return { label: status || "未知状态", className: "bg-secondary text-secondary-foreground border-border" };
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN");
}

function DetailDialog({
  open,
  detail,
  loading,
  levelDraft,
  levelSaving,
  onLevelChange,
  onSaveLevel,
  onClose,
}: {
  open: boolean;
  detail: PromoterDetail | null;
  loading: boolean;
  levelDraft: number;
  levelSaving: boolean;
  onLevelChange: (level: number) => void;
  onSaveLevel: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-xl border border-border bg-background shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
          <div>
            <h2 className="text-xl font-semibold">推广者详情</h2>
            <p className="mt-1 text-sm text-muted-foreground">查看奖励历史并手动调整推广等级。</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !detail ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">暂未获取到推广者详情。</CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
              <PromoterCard
                level={detail.level}
                totalInvites={detail.totalInvites}
                inviteCode={detail.inviteCode}
                nextLevel={detail.nextLevel}
                rewardInfo={detail.rewardInfo}
                title={detail.username}
                description="推广等级、邀请码与当前奖励信息。"
              />

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">等级调整</CardTitle>
                    <CardDescription>当前等级：{getPromoterLevelMeta(detail.level).label}。保存后会立即刷新列表和详情。</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="w-full sm:max-w-[220px]">
                      <label className="mb-2 block text-sm font-medium text-muted-foreground">推广等级</label>
                      <select
                        value={levelDraft}
                        onChange={(event) => onLevelChange(Number(event.target.value))}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {[1, 2, 3, 4, 5].map((level) => (
                          <option key={level} value={level}>{getPromoterLevelMeta(level).label}</option>
                        ))}
                      </select>
                    </div>
                    <Button onClick={onSaveLevel} disabled={levelSaving || levelDraft === detail.level}>
                      {levelSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          保存中...
                        </>
                      ) : (
                        "保存等级"
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">奖励历史</CardTitle>
                    <CardDescription>累计积分 {detail.totalCredits} · 累计会员天数 {detail.totalVipDays ?? 0}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="px-4 py-3 font-medium text-muted-foreground">被邀请人</th>
                            <th className="px-4 py-3 font-medium text-muted-foreground text-right">积分奖励</th>
                            <th className="px-4 py-3 font-medium text-muted-foreground text-right">会员天数</th>
                            <th className="px-4 py-3 font-medium text-muted-foreground">状态</th>
                            <th className="px-4 py-3 font-medium text-muted-foreground">冻结到期</th>
                            <th className="px-4 py-3 font-medium text-muted-foreground">创建时间</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.rewards.map((reward) => {
                            const statusMeta = getStatusMeta(reward.status);
                            return (
                              <tr key={reward.id} className="border-b border-border/50 hover:bg-accent/20">
                                <td className="px-4 py-3 font-medium">{reward.inviteeUsername || "未知用户"}</td>
                                <td className="px-4 py-3 text-right">+{reward.creditReward}</td>
                                <td className="px-4 py-3 text-right">{reward.vipDaysReward} 天</td>
                                <td className="px-4 py-3">
                                  <Badge variant="outline" className={statusMeta.className}>{statusMeta.label}</Badge>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{formatDateTime(reward.frozenUntil)}</td>
                                <td className="px-4 py-3 text-muted-foreground">{formatDateTime(reward.createdAt)}</td>
                              </tr>
                            );
                          })}
                          {detail.rewards.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">暂无奖励历史记录</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPromoterPage() {
  const [promoters, setPromoters] = React.useState<PromoterListItem[]>([]);
  const [pagination, setPagination] = React.useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [levelFilter, setLevelFilter] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<PromoterDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [levelDraft, setLevelDraft] = React.useState(1);
  const [levelSaving, setLevelSaving] = React.useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = React.useState(false);
  const [releaseLoading, setReleaseLoading] = React.useState(false);

  const fetchPromoters = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminPromoterApi.list({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        level: levelFilter ? Number(levelFilter) : undefined,
      });
      const normalized = normalizeListResponse(data);
      setPromoters(normalized.items);
      setPagination(normalized.pagination);
    } catch (err: any) {
      console.error("Failed to load promoters:", err);
      setError(err?.message || "加载推广者列表失败，请稍后重试。");
      setPromoters([]);
    } finally {
      setLoading(false);
    }
  }, [levelFilter, page, search]);

  const fetchDetail = React.useCallback(async (userId: string) => {
    setDetailLoading(true);
    try {
      const data = await adminPromoterApi.getByUserId(userId);
      const normalized = normalizeDetail(data);
      setDetail(normalized);
      setLevelDraft(normalized.level);
    } catch (err) {
      console.error("Failed to load promoter detail:", err);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPromoters();
  }, [fetchPromoters]);

  React.useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleOpenDetail = async (userId: string) => {
    setSelectedUserId(userId);
    await fetchDetail(userId);
  };

  const handleCloseDetail = () => {
    setSelectedUserId(null);
    setDetail(null);
  };

  const handleSaveLevel = async () => {
    if (!selectedUserId) return;
    setLevelSaving(true);
    try {
      await adminPromoterApi.updateLevel(selectedUserId, levelDraft);
      setNotice("推广等级已更新");
      await Promise.all([fetchPromoters(), fetchDetail(selectedUserId)]);
    } catch (err: any) {
      console.error("Failed to update promoter level:", err);
      setError(err?.message || "更新推广等级失败，请稍后重试。");
    } finally {
      setLevelSaving(false);
    }
  };

  const handleReleaseRewards = async () => {
    setReleaseLoading(true);
    try {
      const result = await adminPromoterApi.releaseRewards();
      setNotice(result?.releasedCount ? `已批量释放 ${result.releasedCount} 条待定奖励` : (result?.message || "已触发待定奖励批量释放"));
      setReleaseDialogOpen(false);
      await fetchPromoters();
      if (selectedUserId) {
        await fetchDetail(selectedUserId);
      }
    } catch (err: any) {
      console.error("Failed to release rewards:", err);
      setError(err?.message || "批量释放奖励失败，请稍后重试。");
    } finally {
      setReleaseLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">推广者管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理推广者等级、奖励记录与批量释放流程。</p>
        </div>
        <Button onClick={() => setReleaseDialogOpen(true)}>
          <RefreshCcw className="h-4 w-4" />
          批量释放待定奖励
        </Button>
      </div>

      {notice && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <Button variant="ghost" size="icon" onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Megaphone className="h-5 w-5 text-primary" />
              推广者列表
            </CardTitle>
            <CardDescription>当前共有 {pagination.total} 位推广者，支持按用户名和等级筛选。</CardDescription>
          </div>
          <form onSubmit={handleSearch} className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="搜索用户名" className="pl-9" />
            </div>
            <select
              value={levelFilter}
              onChange={(event) => {
                setPage(1);
                setLevelFilter(event.target.value);
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">全部等级</option>
              {[1, 2, 3, 4, 5].map((level) => (
                <option key={level} value={level}>{getPromoterLevelMeta(level).label}</option>
              ))}
            </select>
            <Button type="submit" variant="outline">查询</Button>
          </form>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">用户名</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">等级</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">总邀请数</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">总积分</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {promoters.map((promoter) => {
                    const levelMeta = getPromoterLevelMeta(promoter.level);
                    return (
                      <tr key={promoter.userId} className="border-b border-border/50 hover:bg-accent/20">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium">{promoter.username}</div>
                            <div className="text-xs text-muted-foreground">邀请码：{promoter.inviteCode || "未生成"}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={levelMeta.badgeClass}>{levelMeta.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">{promoter.totalInvites}</td>
                        <td className="px-4 py-3 text-right">{promoter.totalCredits}</td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDetail(promoter.userId)}>
                            <Eye className="h-4 w-4" />
                            详情
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {promoters.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-14 text-center text-muted-foreground">暂无推广者数据</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">第 {pagination.page} / {pagination.totalPages} 页</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
              <ChevronLeft className="h-4 w-4" />
              上一页
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((prev) => prev + 1)}>
              下一页
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <DetailDialog
        open={!!selectedUserId}
        detail={detail}
        loading={detailLoading}
        levelDraft={levelDraft}
        levelSaving={levelSaving}
        onLevelChange={setLevelDraft}
        onSaveLevel={handleSaveLevel}
        onClose={handleCloseDetail}
      />

      <ConfirmDialog
        open={releaseDialogOpen}
        title="批量释放待定奖励"
        description="确认后将尝试批量释放所有满足条件的待定奖励。该操作会立即影响推广者奖励状态。"
        confirmLabel="确认释放"
        onConfirm={handleReleaseRewards}
        onCancel={() => setReleaseDialogOpen(false)}
        loading={releaseLoading}
      />
    </div>
  );
}