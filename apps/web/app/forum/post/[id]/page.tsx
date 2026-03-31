'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pin, Lock, Share2, Bookmark, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VoteButton } from '@/components/vote-button';
import { ReplyTree } from '@/components/reply-tree';
import { MarkdownRenderer } from '@/components/markdown-renderer';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface PostData {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  replyCount: number;
  voteScore: number;
  bestAnswerId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  author: { id: string; username: string; avatarUrl: string | null };
  currentUserVote: number | null;
  replies: Reply[];
}

interface Reply {
  id: string;
  content: string;
  parentId: string | null;
  author: { id: string; username: string; avatarUrl: string | null };
  voteScore: number;
  userVote?: 1 | -1 | 0;
  createdAt: string;
  replies?: Reply[];
  isBestAnswer?: boolean;
}

function timeAgo(date: string) {
  const seconds = Math.floor(
    (new Date().getTime() - new Date(date).getTime()) / 1000
  );
  const intervals: [string, number][] = [
    ['年', 31536000],
    ['个月', 2592000],
    ['周', 604800],
    ['天', 86400],
    ['小时', 3600],
    ['分钟', 60],
  ];
  for (const [label, secs] of intervals) {
    const n = Math.floor(seconds / secs);
    if (n >= 1) return `${n}${label}前`;
  }
  return '刚刚';
}

export default function PostDetailPage() {
  const params = useParams();
  const postId = params.id as string;
  const [post, setPost] = React.useState<PostData | null>(null);
  const [replyContent, setReplyContent] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [replyingTo, setReplyingTo] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const getHeaders = () => {
    const token = localStorage.getItem('auth_token');
    const h: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  const transformReplies = (items: any[]): Reply[] =>
    items.map((r) => ({
      ...r,
      userVote: r.currentUserVote ?? r.userVote ?? 0,
      replies: r.children ? transformReplies(r.children) : r.replies ? transformReplies(r.replies) : [],
    }));

  const fetchPost = React.useCallback(() => {
    fetch(`${API_BASE}/api/forum/posts/${postId}`, { headers: getHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const post = data.data;
          if (post.replies) post.replies = transformReplies(post.replies);
          setPost(post);
        } else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [postId]);

  React.useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handlePostVote = async (value: 1 | -1) => {
    const res = await fetch(`${API_BASE}/api/forum/posts/${postId}/vote`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ value }),
    }).then((r) => r.json());
    if (res.success) fetchPost();
  };

  const handleVote = async (replyId: string, value: 1 | -1) => {
    const res = await fetch(`${API_BASE}/api/forum/replies/${replyId}/vote`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ value }),
    }).then((r) => r.json());
    if (res.success) fetchPost();
  };

  const handleReply = async (parentId: string | null = null) => {
    if (!replyContent.trim()) return;
    setIsSubmitting(true);
    try {
      const body: Record<string, string> = { content: replyContent };
      if (parentId) body.parentReplyId = parentId;
      const res = await fetch(
        `${API_BASE}/api/forum/posts/${postId}/replies`,
        { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) }
      ).then((r) => r.json());
      if (res.success) {
        setReplyContent('');
        setReplyingTo(null);
        fetchPost();
      }
    } catch {}
    setIsSubmitting(false);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: post?.title, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  if (loading) {
    return (
      <div className="container py-8 md:py-12">
        <div className="h-4 w-20 bg-muted rounded animate-pulse mb-6" />
        <div className="rounded-lg border bg-card p-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-2/3 mb-4" />
          <div className="h-4 bg-muted rounded w-1/3 mb-6" />
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container py-8 md:py-12 text-center">
        <p className="text-muted-foreground mb-4">帖子不存在或加载失败</p>
        <Link href="/forum">
          <Button variant="outline">返回论坛</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12">
      <Link
        href="/forum"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回论坛
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex gap-4">
                <VoteButton
                  score={post.voteScore}
                  userVote={(post.currentUserVote || 0) as 0 | 1 | -1}
                  onVote={handlePostVote}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {post.isPinned && (
                      <Badge variant="default" className="gap-1">
                        <Pin className="w-3 h-3" />
                        置顶
                      </Badge>
                    )}
                    {post.isLocked && (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="w-3 h-3" />
                        锁定
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold mb-4">{post.title}</h1>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-4">
                    <Link
                      href={`/user/${post.author.username}`}
                      className="flex items-center gap-2 hover:text-foreground"
                    >
                      {post.author.avatarUrl ? (
                        <img
                          src={post.author.avatarUrl}
                          alt={post.author.username}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-primary flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {post.author.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="font-medium">{post.author.username}</span>
                    </Link>
                    <span>{timeAgo(post.createdAt)}</span>
                    <span>{post.viewCount} 阅读</span>
                    <span>{post.replyCount} 回复</span>
                  </div>

                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="mt-6">
                    <MarkdownRenderer content={post.content} />
                  </div>

                  <div className="flex items-center gap-4 mt-6 pt-4 border-t">
                    <Button variant="ghost" size="sm" onClick={handleShare}>
                      <Share2 className="w-4 h-4 mr-1" />
                      分享
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Bookmark className="w-4 h-4 mr-1" />
                      收藏
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Flag className="w-4 h-4 mr-1" />
                      举报
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">
                {post.replyCount} 个回复
              </h2>
            </CardHeader>
            <CardContent>
              {post.replies && post.replies.length > 0 ? (
                <ReplyTree
                  replies={post.replies}
                  postId={post.id}
                  onVote={handleVote}
                  onReply={(parentId) => setReplyingTo(parentId)}
                />
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  暂无回复，成为第一个回复的人吧！
                </p>
              )}
            </CardContent>
          </Card>

          {!post.isLocked && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold">
                  {replyingTo ? '回复回复' : '发表评论'}
                </h3>
              </CardHeader>
              <CardContent>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="输入你的回复..."
                  className="w-full min-h-[120px] p-3 rounded-lg border bg-background resize-y focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex items-center justify-between mt-4">
                  {replyingTo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingTo(null)}
                    >
                      取消回复
                    </Button>
                  )}
                  <Button
                    variant="gradient"
                    onClick={() => handleReply(replyingTo)}
                    disabled={!replyContent.trim() || isSubmitting}
                    className="ml-auto"
                  >
                    {isSubmitting ? '发布中...' : '发布回复'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="font-semibold">作者</h3>
            </CardHeader>
            <CardContent>
              <Link
                href={`/user/${post.author.username}`}
                className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                {post.author.avatarUrl ? (
                  <img
                    src={post.author.avatarUrl}
                    alt={post.author.username}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
                    <span className="text-white text-lg font-bold">
                      {post.author.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium">{post.author.username}</p>
                  <p className="text-xs text-muted-foreground">点击查看主页</p>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold">相关操作</h3>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4 mr-2" />
                分享帖子
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Bookmark className="w-4 h-4 mr-2" />
                收藏帖子
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
