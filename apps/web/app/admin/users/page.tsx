"use client";

import * as React from "react";
import {
  adminUsersApi,
  type AdminUser,
  type UserDetail,
} from "@/lib/admin/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/lib/admin/confirm-dialog";
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  User as UserIcon,
  MoreVertical,
  Eye,
  Trash2,
  Download,
  Heart,
  MessageSquare,
  X,
  AlertCircle,
} from "lucide-react";

const roleColors: Record<string, string> = {
  admin: "text-red-400 bg-red-400/10",
  moderator: "text-amber-400 bg-amber-400/10",
  user: "text-blue-400 bg-blue-400/10",
};

function UserDetailPanel({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = React.useState<UserDetail | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    adminUsersApi.getById(userId).then(setDetail).finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!detail) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          用户不存在
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
            {detail.avatarUrl ? (
              <img src={detail.avatarUrl} alt="" className="h-12 w-12 rounded-full" />
            ) : (
              <UserIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <CardTitle className="text-lg">{detail.username}</CardTitle>
            <p className="text-sm text-muted-foreground">{detail.email}</p>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${roleColors[detail.role] || roleColors.user}`}>
              {detail.role === "admin" && <Shield className="h-3 w-3" />}
              {detail.role}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 rounded-lg bg-secondary/50">
            <div className="text-lg font-bold">{detail.stats.resourceCount}</div>
            <div className="text-xs text-muted-foreground">资源</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-secondary/50">
            <div className="text-lg font-bold flex items-center justify-center gap-1">
              <Download className="h-4 w-4" />
              {detail.stats.totalDownloads}
            </div>
            <div className="text-xs text-muted-foreground">下载</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-secondary/50">
            <div className="text-lg font-bold flex items-center justify-center gap-1">
              <Heart className="h-4 w-4" />
              {detail.stats.totalLikes}
            </div>
            <div className="text-xs text-muted-foreground">点赞</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between p-2 rounded bg-secondary/30">
            <span className="text-muted-foreground">评论</span>
            <span>{detail.stats.commentCount}</span>
          </div>
          <div className="flex justify-between p-2 rounded bg-secondary/30">
            <span className="text-muted-foreground">论坛帖子</span>
            <span>{detail.stats.forumPostCount}</span>
          </div>
          <div className="flex justify-between p-2 rounded bg-secondary/30">
            <span className="text-muted-foreground">论坛回复</span>
            <span>{detail.stats.forumReplyCount}</span>
          </div>
          <div className="flex justify-between p-2 rounded bg-secondary/30">
            <span className="text-muted-foreground">注册时间</span>
            <span>{new Date(detail.createdAt).toLocaleDateString("zh-CN")}</span>
          </div>
        </div>
        {detail.bio && (
          <div className="mt-4 p-3 rounded-lg bg-secondary/30 text-sm text-muted-foreground">
            {detail.bio}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [pagination, setPagination] = React.useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);

  // Role change dialog
  const [roleDialog, setRoleDialog] = React.useState<{ userId: string; newRole: string } | null>(null);
  const [roleLoading, setRoleLoading] = React.useState(false);

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = React.useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminUsersApi.list({
        page,
        limit: 20,
        search: search || undefined,
        role: roleFilter || undefined,
      });
      setUsers(data.items);
      setPagination(data.pagination);
    } catch (e: any) {
      console.error("Failed to load users:", e);
      setError(e?.message || "加载用户列表失败");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleChangeRole = async () => {
    if (!roleDialog) return;
    setRoleLoading(true);
    try {
      await adminUsersApi.updateRole(roleDialog.userId, roleDialog.newRole);
      setRoleDialog(null);
      fetchUsers();
      if (selectedUserId === roleDialog.userId) {
        // refresh detail panel
        setSelectedUserId(null);
        setTimeout(() => setSelectedUserId(roleDialog.userId), 0);
      }
    } catch {
      // error toast could go here
    } finally {
      setRoleLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    setDeleteLoading(true);
    try {
      await adminUsersApi.delete(deleteDialog);
      setDeleteDialog(null);
      if (selectedUserId === deleteDialog) setSelectedUserId(null);
      fetchUsers();
    } catch {
      // error toast
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">用户管理</h1>
        <p className="text-muted-foreground text-sm mt-1">
          共 {pagination.total} 个用户
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button className="p-1 hover:bg-destructive/20 rounded" onClick={() => { setError(null); fetchUsers(); }}>
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
              placeholder="搜索用户名或邮箱..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">搜索</Button>
        </form>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">全部角色</option>
          <option value="user">用户</option>
          <option value="moderator">版主</option>
          <option value="admin">管理员</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className={selectedUserId ? "lg:col-span-2" : "lg:col-span-3"}>
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
                        <th className="px-4 py-3 font-medium text-muted-foreground">用户</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground">角色</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground text-right">资源</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground">注册时间</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr
                          key={u.id}
                          className={`border-b border-border/50 hover:bg-accent/30 cursor-pointer ${selectedUserId === u.id ? "bg-accent/20" : ""}`}
                          onClick={() => setSelectedUserId(u.id === selectedUserId ? null : u.id)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                                {u.avatarUrl ? (
                                  <img src={u.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
                                ) : (
                                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium">{u.username}</div>
                                <div className="text-xs text-muted-foreground">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role] || roleColors.user}`}>
                              {u.role === "admin" && <Shield className="h-3 w-3" />}
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">{u.resourceCount}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedUserId(u.id)}
                                title="查看详情"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <select
                                value={u.role}
                                onChange={() => setRoleDialog({ userId: u.id, newRole: u.role })}
                                className="h-8 rounded border border-input bg-background px-2 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="user">user</option>
                                <option value="moderator">moderator</option>
                                <option value="admin">admin</option>
                              </select>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteDialog(u.id)}
                                title="删除用户"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                            暂无用户数据
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
            <div className="flex items-center justify-between mt-4">
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

        {/* Detail panel */}
        {selectedUserId && (
          <div className="lg:col-span-1">
            <UserDetailPanel userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
          </div>
        )}
      </div>

      {/* Role change dialog */}
      <ConfirmDialog
        open={!!roleDialog}
        title="修改用户角色"
        description={
          roleDialog
            ? `确定要将用户角色更改为 "${roleDialog.newRole}" 吗？`
            : ""
        }
        confirmLabel="确认修改"
        onConfirm={handleChangeRole}
        onCancel={() => setRoleDialog(null)}
        loading={roleLoading}
      />

      {/* Delete dialog */}
      <ConfirmDialog
        open={!!deleteDialog}
        title="删除用户"
        description="确定要删除此用户吗？该操作不可恢复，用户的所有资源和数据将被级联删除。"
        confirmLabel="确认删除"
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
