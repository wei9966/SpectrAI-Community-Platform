'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pin, Lock, Share2, Bookmark, Flag, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VoteButton } from '@/components/vote-button';
import { ReplyTree } from '@/components/reply-tree';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { cn } from '@/lib/utils';

interface Reply {
  id: string;
  content: string;
  parentId: string | null;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  voteScore: number;
  userVote?: 1 | -1 | 0;
  createdAt: Date;
  replies?: Reply[];
  isBestAnswer?: boolean;
}

// Mock 帖子数据
const mockPost = {
  id: 'p1',
  title: '如何使用 SpectrAI 构建多代理系统',
  content: `## 前言

多代理系统是目前 AI 应用的一个重要方向。通过多个专业代理的协作，可以完成复杂任务。

## 什么是多代理系统

多代理系统由多个独立的 AI 代理组成，每个代理有特定的职责：

- **规划代理**：分析用户需求，分解任务
- **执行代理**：执行具体操作
- **审核代理**：检查结果质量
- **协调代理**：管理代理间的通信

## 如何在 SpectrAI 中实现

使用 SpectrAI 的团队配置功能，可以轻松搭建多代理系统：

\`\`\`json
{
  "roles": [
    {
      "name": "规划代理",
      "permissions": ["read", "plan"]
    },
    {
      "name": "执行代理",
      "permissions": ["read", "execute"]
    }
  ]
}
\`\`\`

## 实践经验

1. **明确定义职责**：每个代理的职责要清晰，避免重叠
2. **合理分配权限**：根据职责分配最小必要的权限
3. **建立通信机制**：代理之间需要有效的通信方式

## 总结

SpectrAI 为多代理系统的构建提供了强大的支持，期待看到更多创新应用！`,
  author: {
    id: 'u1',
    username: 'AgentExpert',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AgentExpert',
  },
  category: {
    id: 'c1',
    name: '综合讨论',
    slug: 'general',
  },
  voteScore: 128,
  userVote: 0 as 1 | -1 | 0,
  viewCount: 1234,
  replyCount: 45,
  isPinned: true,
  isLocked: false,
  bestAnswerId: 'r2',
  tags: ['多代理', '架构', '最佳实践'],
  createdAt: new Date('2025-03-30T10:00:00Z'),
  updatedAt: new Date('2025-03-30T10:00:00Z'),
};

// Mock 回复数据
const mockReplies: Reply[] = [
  {
    id: 'r1',
    content: '非常好的分享！我最近也在研究多代理系统，受益匪浅。',
    parentId: null,
    author: {
      id: 'u2',
      username: 'AILearner',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AILearner',
    },
    voteScore: 45,
    createdAt: new Date('2025-03-30T11:00:00Z'),
    replies: [
      {
        id: 'r1-1',
        content: '一起学习！',
        parentId: 'r1',
        author: {
          id: 'u3',
          username: 'NewJoiner',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NewJoiner',
        },
        voteScore: 12,
        createdAt: new Date('2025-03-30T12:00:00Z'),
      },
    ],
  },
  {
    id: 'r2',
    content: `关于权限分配，我有一点补充：

建议使用最小权限原则，即每个代理只拥有完成其任务所需的最小权限集合。这可以提高系统安全性。`,
    parentId: null,
    author: {
      id: 'u4',
      username: 'SecurityExpert',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SecurityExpert',
    },
    voteScore: 67,
    userVote: 1,
    createdAt: new Date('2025-03-30T13:00:00Z'),
    isBestAnswer: true,
    replies: [
      {
        id: 'r2-1',
        content: '这个建议很好！已采纳。',
        parentId: 'r2',
        author: {
          id: 'u1',
          username: 'AgentExpert',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AgentExpert',
        },
        voteScore: 23,
        createdAt: new Date('2025-03-30T14:00:00Z'),
      },
    ],
  },
  {
    id: 'r3',
    content: '请问规划代理和协调代理有什么区别？我感觉职责有重叠。',
    parentId: null,
    author: {
      id: 'u5',
      username: 'CuriousDev',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CuriousDev',
    },
    voteScore: 8,
    createdAt: new Date('2025-03-30T15:00:00Z'),
    replies: [
      {
        id: 'r3-1',
        content: '规划代理专注于任务分解，协调代理专注于代理间的通信和状态管理。职责确实有重叠，实际项目中可以根据需要合并或拆分。',
        parentId: 'r3',
        author: {
          id: 'u1',
          username: 'AgentExpert',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AgentExpert',
        },
        voteScore: 15,
        createdAt: new Date('2025-03-30T16:00:00Z'),
        replies: [
          {
            id: 'r3-1-1',
            content: '明白了，感谢解答！',
            parentId: 'r3-1',
            author: {
              id: 'u5',
              username: 'CuriousDev',
              avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CuriousDev',
            },
            voteScore: 5,
            createdAt: new Date('2025-03-30T17:00:00Z'),
          },
        ],
      },
    ],
  },
];

export default function PostDetailPage() {
  const params = useParams();
  const postId = params.id as string;
  const [post, setPost] = React.useState(mockPost);
  const [replies, setReplies] = React.useState(mockReplies);
  const [replyContent, setReplyContent] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [replyingTo, setReplyingTo] = React.useState<string | null>(null);

  const timeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    const intervals: Record<string, number> = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval}${unit === 'year' ? '年' : unit === 'month' ? '个月' : unit === 'week' ? '周' : unit === 'day' ? '天' : unit === 'hour' ? '小时' : unit === 'minute' ? '分钟' : ''}前`;
      }
    }
    return '刚刚';
  };

  const handleVote = async (replyId: string, value: 1 | -1) => {
    // TODO: API 调用
    console.log('Vote:', replyId, value);
  };

  const handlePostVote = async (value: 1 | -1) => {
    // TODO: API 调用
    console.log('Post vote:', value);
  };

  const handleReply = async (parentId: string | null = null) => {
    if (!replyContent.trim()) return;

    setIsSubmitting(true);
    // TODO: API 调用
    console.log('Reply:', { content: replyContent, parentId });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setReplyContent('');
    setReplyingTo(null);
    setIsSubmitting(false);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: post.title, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <div className="container py-8 md:py-12">
      {/* 返回按钮 */}
      <Link
        href={`/forum/${post.category.slug}`}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回 {post.category.name}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 主内容 */}
        <div className="lg:col-span-3 space-y-6">
          {/* 帖子内容 */}
          <Card>
            <CardContent className="p-6">
              <div className="flex gap-4">
                {/* 投票 */}
                <VoteButton
                  score={post.voteScore}
                  userVote={post.userVote}
                  onVote={handlePostVote}
                  size="lg"
                />

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  {/* 标题 */}
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

                  {/* 元信息 */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-4">
                    <Link
                      href={`/user/${post.author.username}`}
                      className="flex items-center gap-2 hover:text-foreground"
                    >
                      {post.author.avatarUrl && (
                        <img
                          src={post.author.avatarUrl}
                          alt={post.author.username}
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <span className="font-medium">{post.author.username}</span>
                    </Link>
                    <span>{timeAgo(post.createdAt)}</span>
                    <span>{post.viewCount} 阅读</span>
                    <span>{post.replyCount} 回复</span>
                  </div>

                  {/* 标签 */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* 正文 */}
                  <div className="mt-6">
                    <MarkdownRenderer content={post.content} />
                  </div>

                  {/* 操作 */}
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

          {/* 回复列表 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {post.replyCount} 个回复
                </h2>
              </div>
            </CardHeader>
            <CardContent>
              {replies.length > 0 ? (
                <ReplyTree
                  replies={replies}
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

          {/* 回复输入框 */}
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

        {/* 侧边栏 */}
        <div className="space-y-6">
          {/* 作者信息 */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">作者</h3>
            </CardHeader>
            <CardContent>
              <Link
                href={`/user/${post.author.username}`}
                className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                {post.author.avatarUrl && (
                  <img
                    src={post.author.avatarUrl}
                    alt={post.author.username}
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium">{post.author.username}</p>
                  <p className="text-xs text-muted-foreground">点击查看主页</p>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* 相关操作 */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">相关操作</h3>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={handleShare}>
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
