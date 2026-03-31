"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Check, X, AlertCircle, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { forumApi, PendingPost } from "@spectrai-community/shared";
import { cn } from "@/lib/utils";

export default function AdminPostsPage() {
  const [posts, setPosts] = React.useState<PendingPost[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rejectingId, setRejectingId] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [processing, setProcessing] = React.useState<string | null>(null);

  // 检查管理员权限
  const isAdmin = React.useCallback(() => {
    if (typeof window === "undefined") return false;
    const userStr = localStorage.getItem("user");
    if (!userStr) return false;
    try {
      const user = JSON.parse(userStr);
      return user.role === "admin" || user.role === "moderator";
    } catch {
      return false;
    }
  }, []);

  const [hasPermission, setHasPermission] = React.useState(false);

  React.useEffect(() => {
    setHasPermission(isAdmin());
  }, [isAdmin]);

  // 加载待审核帖子
  React.useEffect(() => {
    if (!hasPermission) return;

    const loadPendingPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await forumApi.getPendingPosts();
        if (result.success && result.data) {
          setPosts(result.data);
        } else {
          setError(result.error || "加载失败");
        }
      } catch (err) {
        setError("网络错误，请稍后重试");
      } finally {
        setLoading(false);
      }
    };

    loadPendingPosts();
  }, [hasPermission]);

  // 审核通过
  const handleApprove = async (postId: string) => {
    try {
      setProcessing(postId);
      const result = await forumApi.reviewPost(postId, "approve");
      if (result.success) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } else {
        setError(result.error || "操作失败");
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setProcessing(null);
    }
  };

  // 拒绝帖子
  const handleReject = async (postId: string) => {
    if (!rejectReason.trim()) {
      setError("请填写拒绝原因");
      return;
    }

    try {
      setProcessing(postId);
      const result = await forumApi.reviewPost(postId, "reject", rejectReason);
      if (result.success) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        setRejectingId(null);
        setRejectReason("");
      } else {
        setError(result.error || "操作失败");
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setProcessing(null);
    }
  };

  // 无权限
  if (!hasPermission) {
    return (
      <div className="container py-16 text-center">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
        <h1 className="text-2xl font-bold mb-4">无权限访问</h1>
        <p className="text-muted-foreground mb-8">
          您没有管理员权限，无法访问此页面
        </p>
        <Link href="/">
          <Button variant="gradient">返回首页</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12">
      {/* 返回按钮 */}
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回管理后台
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">帖子审核</h1>
          <p className="text-muted-foreground">审核待发布的论坛帖子</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Clock className="w-4 h-4 mr-2" />
          {posts.length} 篇待审核
        </Badge>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button
            className="ml-auto p-1 hover:bg-destructive/20 rounded"
            onClick={() => setError(null)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* 空状态 */}
      {!loading && posts.length === 0 && (
        <Card className="text-center py-16">
          <CardContent>
            <Check className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2">太棒了！</h2>
            <p className="text-muted-foreground">目前没有待审核的帖子</p>
          </CardContent>
        </Card>
      )}

      {/* 帖子列表 */}
      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">{post.title}</CardTitle>
                  <CardDescription className="flex items-center gap-4">
                    <span>板块：{post.category.name}</span>
                    <span>作者：{post.author.username}</span>
                    <span>
                      发布时间：{new Date(post.createdAt).toLocaleString("zh-CN")}
                    </span>
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="ml-4">
                  待审核
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* 帖子内容预览 */}
              <div className="mb-6 p-4 rounded-lg bg-secondary/30">
                <p className="text-sm whitespace-pre-wrap">{post.content}</p>
              </div>

              {/* 拒绝原因输入 */}
              {rejectingId === post.id ? (
                <div className="space-y-4">
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="请填写拒绝原因，以便作者了解如何修改"
                    className="min-h-[100px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRejectingId(null);
                        setRejectReason("");
                        setError(null);
                      }}
                    >
                      取消
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(post.id)}
                      disabled={processing === post.id}
                    >
                      {processing === post.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          处理中...
                        </>
                      ) : (
                        <>确认拒绝</>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleApprove(post.id)}
                    disabled={processing === post.id}
                  >
                    {processing === post.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        处理中...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        通过
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setRejectingId(post.id)}
                    disabled={processing === post.id}
                  >
                    <X className="w-4 h-4 mr-2" />
                    拒绝
                  </Button>
                  <Link href={`/forum/post/${post.id}`} className="ml-auto">
                    <Button variant="outline">查看详情</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
