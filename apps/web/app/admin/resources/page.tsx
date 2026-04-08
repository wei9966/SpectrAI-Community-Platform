"use client";

import * as React from "react";
import {
  adminResourcesApi,
  type AdminResource,
} from "@/lib/admin/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/lib/admin/confirm-dialog";
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
  AlertCircle,
  X,
} from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "text-gray-400 bg-gray-400/10",
  pending: "text-amber-400 bg-amber-400/10",
  approved: "text-emerald-400 bg-emerald-400/10",
  rejected: "text-red-400 bg-red-400/10",
};

const typeLabels: Record<string, string> = {
  workflow: "Workflow",
  team: "Team",
  skill: "Skill",
  mcp: "MCP",
};

export default function AdminResourcesPage() {
  const [items, setItems] = React.useState<AdminResource[]>([]);
  const [pagination, setPagination] = React.useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [page, setPage] = React.useState(1);

  // Publish/unpublish dialog
  const [publishDialog, setPublishDialog] = React.useState<{ id: string; publish: boolean; name: string } | null>(null);
  const [publishLoading, setPublishLoading] = React.useState(false);

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = React.useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const fetchResources = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminResourcesApi.list({
        page,
        limit: 20,
        search: search || undefined,
        type: typeFilter || undefined,
        reviewStatus: statusFilter || undefined,
      });
      setItems(data.items);
      setPagination(data.pagination);
    } catch (e: any) {
      console.error("Failed to load resources:", e);
      setError(e?.message || "加载资源列表失败");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter]);

  React.useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handlePublish = async () => {
    if (!publishDialog) return;
    setPublishLoading(true);
    try {
      await adminResourcesApi.togglePublish(publishDialog.id, publishDialog.publish);
      setPublishDialog(null);
      fetchResources();
    } catch {
      // error toast
    } finally {
      setPublishLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    setDeleteLoading(true);
    try {
      await adminResourcesApi.delete(deleteDialog.id);
      setDeleteDialog(null);
      fetchResources();
    } catch {
      // error toast
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">资源管理</h1>
        <p className="text-muted-foreground text-sm mt-1">
          共 {pagination.total} 个资源
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button className="p-1 hover:bg-destructive/20 rounded" onClick={() => { setError(null); fetchResources(); }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索资源名称..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">搜索</Button>
        </form>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">全部类型</option>
          <option value="workflow">Workflow</option>
          <option value="team">Team</option>
          <option value="skill">Skill</option>
          <option value="mcp">MCP</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="pending">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已驳回</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">资源</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">类型</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">状态</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">下载</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">点赞</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">作者</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">创建时间</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-accent/30">
                      <td className="px-4 py-3">
                        <div className="max-w-[200px]">
                          <div className="font-medium truncate">{r.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{r.description}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-secondary">
                          {typeLabels[r.type] || r.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.reviewStatus] || statusColors.draft}`}>
                          {r.reviewStatus}
                          {r.isPublished && " ✓"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="flex items-center justify-end gap-1 text-muted-foreground">
                          <Download className="h-3 w-3" /> {r.downloads}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="flex items-center justify-end gap-1 text-muted-foreground">
                          <Heart className="h-3 w-3" /> {r.likes}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.authorUsername ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString("zh-CN")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <a href={`/resource/${r.id}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" title="查看资源">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                          {r.isPublished ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="下架"
                              onClick={() => setPublishDialog({ id: r.id, publish: false, name: r.name })}
                            >
                              <EyeOff className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="上架"
                              onClick={() => setPublishDialog({ id: r.id, publish: true, name: r.name })}
                            >
                              <Eye className="h-4 w-4 text-emerald-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            title="删除"
                            onClick={() => setDeleteDialog({ id: r.id, name: r.name })}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                        暂无资源数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Publish/unpublish dialog */}
      <ConfirmDialog
        open={!!publishDialog}
        title={publishDialog?.publish ? "上架资源" : "下架资源"}
        description={
          publishDialog
            ? publishDialog.publish
              ? `确定要上架资源 "${publishDialog.name}" 吗？上架后所有用户可见。`
              : `确定要下架资源 "${publishDialog.name}" 吗？下架后用户将无法访问。`
            : ""
        }
        confirmLabel={publishDialog?.publish ? "确认上架" : "确认下架"}
        variant={publishDialog?.publish ? "default" : "destructive"}
        onConfirm={handlePublish}
        onCancel={() => setPublishDialog(null)}
        loading={publishLoading}
      />

      {/* Delete dialog */}
      <ConfirmDialog
        open={!!deleteDialog}
        title="删除资源"
        description={
          deleteDialog
            ? `确定要删除资源 "${deleteDialog.name}" 吗？该操作不可恢复。`
            : ""
        }
        confirmLabel="确认删除"
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
