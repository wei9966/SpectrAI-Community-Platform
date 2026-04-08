"use client";

import * as React from "react";
import {
  adminForumApi,
  adminStatsApi,
  type AdminForumPost,
  type AdminForumCategory,
  type ForumStats,
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
  Pin,
  PinOff,
  Lock,
  Unlock,
  Trash2,
  ExternalLink,
  MessageSquare,
  Eye,
  ThumbsUp,
  Plus,
  Pencil,
  FolderOpen,
  Hash,
  AlertCircle,
  X,
} from "lucide-react";

// ── Tab type ─────────────────────────────────────────────────

type Tab = "posts" | "categories";

// ── Category form dialog ─────────────────────────────────────

function CategoryFormDialog({
  open,
  category,
  onSave,
  onCancel,
}: {
  open: boolean;
  category: AdminForumCategory | null;
  onSave: (data: {
    name: string;
    slug: string;
    description: string;
    icon: string;
    sortOrder: number;
  }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [icon, setIcon] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState(0);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (category) {
      setName(category.name);
      setSlug(category.slug);
      setDescription(category.description || "");
      setIcon(category.icon || "");
      setSortOrder(category.sortOrder);
    } else {
      setName("");
      setSlug("");
      setDescription("");
      setIcon("");
      setSortOrder(0);
    }
  }, [category, open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      onSave({ name, slug, description, icon, sortOrder });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative z-50 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <h2 className="text-lg font-semibold mb-4">
          {category ? "编辑分类" : "新建分类"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">名称</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：技术讨论"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Slug</label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="例如：tech-discussion"
              pattern="^[a-z0-9-]+$"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">仅小写字母、数字和连字符</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">描述</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="分类简介（可选）"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground">图标</label>
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="例如：💬"
              />
            </div>
            <div className="w-24">
              <label className="text-sm font-medium text-muted-foreground">排序</label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              取消
            </Button>
            <Button type="submit" disabled={saving || !name || !slug}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────

export default function AdminForumPage() {
  const [tab, setTab] = React.useState<Tab>("posts");

  // Stats
  const [stats, setStats] = React.useState<ForumStats | null>(null);

  // Posts state
  const [posts, setPosts] = React.useState<AdminForumPost[]>([]);
  const [pagination, setPagination] = React.useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [postsLoading, setPostsLoading] = React.useState(true);
  const [postsError, setPostsError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [page, setPage] = React.useState(1);

  // Categories state
  const [categories, setCategories] = React.useState<AdminForumCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = React.useState(true);
  const [categoriesError, setCategoriesError] = React.useState<string | null>(null);

  // Dialogs
  const [deleteDialog, setDeleteDialog] = React.useState<{ id: string; title: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [categoryFormOpen, setCategoryFormOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<AdminForumCategory | null>(null);
  const [deleteCategoryDialog, setDeleteCategoryDialog] = React.useState<{ id: string; name: string } | null>(null);
  const [deleteCategoryLoading, setDeleteCategoryLoading] = React.useState(false);

  // ── Fetch data ────────────────────────────────────────────

  const fetchStats = React.useCallback(async () => {
    try {
      const data = await adminStatsApi.forum();
      setStats(data);
    } catch { /* auth guard handles */ }
  }, []);

  const fetchPosts = React.useCallback(async () => {
    setPostsLoading(true);
    setPostsError(null);
    try {
      const data = await adminForumApi.listPosts({
        page,
        limit: 20,
        search: search || undefined,
        categoryId: categoryFilter || undefined,
      });
      setPosts(data.items);
      setPagination(data.pagination);
    } catch (e: any) {
      console.error("Failed to load posts:", e);
      setPostsError(e?.message || "加载帖子列表失败");
      setPosts([]);
    } finally { setPostsLoading(false); }
  }, [page, search, categoryFilter]);

  const fetchCategories = React.useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const data = await adminForumApi.listCategories();
      setCategories(data);
    } catch (e: any) {
      console.error("Failed to load categories:", e);
      setCategoriesError(e?.message || "加载分类列表失败");
      setCategories([]);
    } finally { setCategoriesLoading(false); }
  }, []);

  React.useEffect(() => { fetchStats(); }, [fetchStats]);
  React.useEffect(() => { fetchPosts(); }, [fetchPosts]);
  React.useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // ── Handlers ──────────────────────────────────────────────

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleTogglePin = async (post: AdminForumPost) => {
    try {
      await adminForumApi.togglePin(post.id, !post.isPinned);
      fetchPosts();
    } catch { /* */ }
  };

  const handleToggleLock = async (post: AdminForumPost) => {
    try {
      await adminForumApi.toggleLock(post.id, !post.isLocked);
      fetchPosts();
    } catch { /* */ }
  };

  const handleDeletePost = async () => {
    if (!deleteDialog) return;
    setDeleteLoading(true);
    try {
      await adminForumApi.deletePost(deleteDialog.id);
      setDeleteDialog(null);
      fetchPosts();
      fetchStats();
    } catch { /* */ }
    finally { setDeleteLoading(false); }
  };

  const handleSaveCategory = async (data: {
    name: string;
    slug: string;
    description: string;
    icon: string;
    sortOrder: number;
  }) => {
    try {
      if (editingCategory) {
        await adminForumApi.updateCategory(editingCategory.id, data);
      } else {
        await adminForumApi.createCategory(data);
      }
      setCategoryFormOpen(false);
      setEditingCategory(null);
      fetchCategories();
      fetchStats();
    } catch { /* */ }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryDialog) return;
    setDeleteCategoryLoading(true);
    try {
      await adminForumApi.deleteCategory(deleteCategoryDialog.id);
      setDeleteCategoryDialog(null);
      fetchCategories();
      fetchStats();
    } catch { /* */ }
    finally { setDeleteCategoryLoading(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">论坛管理</h1>
        <p className="text-muted-foreground text-sm mt-1">管理论坛帖子和分类</p>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">帖子总数</div>
              <div className="text-2xl font-bold mt-1">{stats.totalPosts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">回复总数</div>
              <div className="text-2xl font-bold mt-1">{stats.totalReplies}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">7日新帖</div>
              <div className="text-2xl font-bold mt-1">{stats.last7Days.newPosts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">7日新回复</div>
              <div className="text-2xl font-bold mt-1">{stats.last7Days.newReplies}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "posts"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("posts")}
        >
          <MessageSquare className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          帖子管理
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "categories"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("categories")}
        >
          <FolderOpen className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          分类管理
        </button>
      </div>

      {/* ── Posts tab ────────────────────────────────────────── */}
      {tab === "posts" && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索帖子标题..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button type="submit" variant="secondary">搜索</Button>
            </form>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">全部分类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon ? `${cat.icon} ` : ""}{cat.name}
                </option>
              ))}
            </select>
          </div>

          {postsError && (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="flex-1">{postsError}</span>
              <button className="p-1 hover:bg-destructive/20 rounded" onClick={() => { setPostsError(null); fetchPosts(); }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Posts table */}
          <Card>
            <CardContent className="p-0">
              {postsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="px-4 py-3 font-medium text-muted-foreground">帖子</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground">分类</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground">状态</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground text-right">浏览</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground text-right">回复</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground text-right">投票</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground">作者</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground">时间</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.map((p) => (
                        <tr key={p.id} className="border-b border-border/50 hover:bg-accent/30">
                          <td className="px-4 py-3">
                            <div className="max-w-[220px]">
                              <div className="font-medium truncate">{p.title}</div>
                              {p.tags && p.tags.length > 0 && (
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {p.tags.slice(0, 3).map((tag) => (
                                    <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-secondary">
                              {p.categoryName || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5">
                              {p.isPinned && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 font-medium">
                                  置顶
                                </span>
                              )}
                              {p.isLocked && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-400/10 text-red-400 font-medium">
                                  锁定
                                </span>
                              )}
                              {!p.isPinned && !p.isLocked && (
                                <span className="text-xs text-muted-foreground">正常</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="flex items-center justify-end gap-1 text-muted-foreground">
                              <Eye className="h-3 w-3" /> {p.viewCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="flex items-center justify-end gap-1 text-muted-foreground">
                              <MessageSquare className="h-3 w-3" /> {p.replyCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="flex items-center justify-end gap-1 text-muted-foreground">
                              <ThumbsUp className="h-3 w-3" /> {p.voteScore}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {p.username ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {new Date(p.createdAt).toLocaleDateString("zh-CN")}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-0.5">
                              <a href={`/forum/post/${p.id}`} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm" title="查看帖子">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </a>
                              <Button
                                variant="ghost"
                                size="sm"
                                title={p.isPinned ? "取消置顶" : "置顶"}
                                onClick={() => handleTogglePin(p)}
                              >
                                {p.isPinned ? (
                                  <PinOff className="h-4 w-4 text-amber-500" />
                                ) : (
                                  <Pin className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title={p.isLocked ? "解锁" : "锁定"}
                                onClick={() => handleToggleLock(p)}
                              >
                                {p.isLocked ? (
                                  <Unlock className="h-4 w-4 text-red-500" />
                                ) : (
                                  <Lock className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="删除"
                                onClick={() => setDeleteDialog({ id: p.id, title: p.title })}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {posts.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                            暂无帖子数据
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
        </>
      )}

      {/* ── Categories tab ───────────────────────────────────── */}
      {tab === "categories" && (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              共 {categories.length} 个分类
            </p>
            <Button
              size="sm"
              onClick={() => { setEditingCategory(null); setCategoryFormOpen(true); }}
            >
              <Plus className="h-4 w-4 mr-1" /> 新建分类
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {categoriesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="px-4 py-3 font-medium text-muted-foreground w-10">排序</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground">名称</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground">Slug</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground">描述</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground text-right">帖子数</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat) => (
                        <tr key={cat.id} className="border-b border-border/50 hover:bg-accent/30">
                          <td className="px-4 py-3 text-muted-foreground text-center">
                            {cat.sortOrder}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium">
                              {cat.icon ? `${cat.icon} ` : ""}{cat.name}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                              <Hash className="h-3 w-3 inline -mt-0.5" />{cat.slug}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <div className="max-w-[200px] truncate">
                              {cat.description || "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {cat.postCount}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                title="编辑"
                                onClick={() => { setEditingCategory(cat); setCategoryFormOpen(true); }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="删除"
                                onClick={() => setDeleteCategoryDialog({ id: cat.id, name: cat.name })}
                                className="text-destructive hover:text-destructive"
                                disabled={cat.postCount > 0}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {categories.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                            暂无分类，点击"新建分类"创建
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Dialogs ──────────────────────────────────────────── */}

      {/* Delete post dialog */}
      <ConfirmDialog
        open={!!deleteDialog}
        title="删除帖子"
        description={
          deleteDialog
            ? `确定要删除帖子 "${deleteDialog.title}" 吗？该操作不可恢复，帖子下的所有回复也将被删除。`
            : ""
        }
        confirmLabel="确认删除"
        variant="destructive"
        onConfirm={handleDeletePost}
        onCancel={() => setDeleteDialog(null)}
        loading={deleteLoading}
      />

      {/* Delete category dialog */}
      <ConfirmDialog
        open={!!deleteCategoryDialog}
        title="删除分类"
        description={
          deleteCategoryDialog
            ? `确定要删除分类 "${deleteCategoryDialog.name}" 吗？`
            : ""
        }
        confirmLabel="确认删除"
        variant="destructive"
        onConfirm={handleDeleteCategory}
        onCancel={() => setDeleteCategoryDialog(null)}
        loading={deleteCategoryLoading}
      />

      {/* Category form dialog */}
      <CategoryFormDialog
        open={categoryFormOpen}
        category={editingCategory}
        onSave={handleSaveCategory}
        onCancel={() => { setCategoryFormOpen(false); setEditingCategory(null); }}
      />
    </div>
  );
}
