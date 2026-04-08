"use client";

import * as React from "react";
import {
  adminReviewApi,
  type ReviewItem,
} from "@/lib/admin/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Check,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  User as UserIcon,
} from "lucide-react";

const typeLabels: Record<string, string> = {
  workflow: "Workflow",
  team: "Team",
  skill: "Skill",
  mcp: "MCP",
};

export default function AdminReviewPage() {
  const [items, setItems] = React.useState<ReviewItem[]>([]);
  const [pagination, setPagination] = React.useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);

  // Reject dialog
  const [rejectingId, setRejectingId] = React.useState<string | null>(null);
  const [rejectNote, setRejectNote] = React.useState("");
  const [processing, setProcessing] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const fetchPending = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminReviewApi.pending({ page, limit: 20 });
      setItems(data.items);
      setPagination({ page: data.page, limit: data.limit, total: data.total, totalPages: data.totalPages });
    } catch (e: any) {
      setError(e.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, [page]);

  React.useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    setError(null);
    try {
      await adminReviewApi.approve(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setPagination((p) => ({ ...p, total: p.total - 1 }));
    } catch (e: any) {
      setError(e.message || "操作失败");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectNote.trim()) {
      setError("请填写驳回理由");
      return;
    }
    setProcessing(rejectingId);
    setError(null);
    try {
      await adminReviewApi.reject(rejectingId, rejectNote);
      setItems((prev) => prev.filter((i) => i.id !== rejectingId));
      setPagination((p) => ({ ...p, total: p.total - 1 }));
      setRejectingId(null);
      setRejectNote("");
    } catch (e: any) {
      setError(e.message || "操作失败");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">审核队列</h1>
          <p className="text-muted-foreground text-sm mt-1">审核待发布的资源</p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          <Clock className="w-4 h-4 mr-1.5" />
          {pagination.total} 个待审核
        </Badge>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button className="p-1 hover:bg-destructive/20 rounded" onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <Check className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
            <h2 className="text-lg font-semibold mb-2">全部搞定！</h2>
            <p className="text-sm text-muted-foreground">没有待审核的资源</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg mb-1 truncate">{item.name}</CardTitle>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono px-1.5 py-0.5 rounded bg-secondary">
                        {typeLabels[item.type] || item.type}
                      </span>
                      <span>v{item.version}</span>
                      <span className="flex items-center gap-1">
                        <UserIcon className="h-3 w-3" />
                        {item.author.username}
                      </span>
                      <span>{new Date(item.createdAt).toLocaleString("zh-CN")}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0">待审核</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {item.description && (
                  <div className="mb-4 p-3 rounded-lg bg-secondary/30 text-sm text-muted-foreground line-clamp-3">
                    {item.description}
                  </div>
                )}

                {rejectingId === item.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="请填写驳回理由，以便作者了解如何修改"
                      className="min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setRejectingId(null); setRejectNote(""); setError(null); }}
                      >
                        取消
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleReject}
                        disabled={processing === item.id}
                      >
                        {processing === item.id ? (
                          <><Loader2 className="h-4 w-4 mr-1 animate-spin" />处理中...</>
                        ) : (
                          "确认驳回"
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleApprove(item.id)}
                      disabled={processing === item.id}
                    >
                      {processing === item.id ? (
                        <><Loader2 className="h-4 w-4 mr-1 animate-spin" />处理中...</>
                      ) : (
                        <><Check className="h-4 w-4 mr-1" />通过</>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setRejectingId(item.id)}
                      disabled={processing === item.id}
                    >
                      <X className="h-4 w-4 mr-1" />驳回
                    </Button>
                    <a href={`/resource/${item.id}`} target="_blank" rel="noopener noreferrer" className="ml-auto">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-1" />查看详情
                      </Button>
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            第 {pagination.page} / {pagination.totalPages} 页
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" /> 上一页
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
              下一页 <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
