"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import type { PublicComment } from "@spectrai-community/shared";

interface CommentSectionProps {
  comments: PublicComment[];
  resourceId: string;
  onAddComment?: (content: string) => Promise<void>;
}

export function CommentSection({
  comments,
  resourceId,
  onAddComment,
}: CommentSectionProps) {
  const [commentList, setCommentList] = React.useState(comments);
  const [content, setContent] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !onAddComment) return;

    setIsSubmitting(true);
    try {
      await onAddComment(content);
      setContent("");
      // 刷新评论列表（实际应用中应该从 API 获取）
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        return `${interval}${unit === 'year' ? '年' : unit === 'month' ? '个月' : unit === 'week' ? '周' : unit === 'day' ? '天' : unit === 'hour' ? '小时' : '分钟'}前`;
      }
    }
    return '刚刚';
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">评论区 ({commentList.length})</h3>

      {/* 发表评论表单 */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="写下你的评论..."
          className="min-h-[100px]"
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !content.trim()}>
            <Send className="w-4 h-4 mr-2" />
            发表评论
          </Button>
        </div>
      </form>

      {/* 评论列表 */}
      <div className="space-y-4">
        {commentList.map((comment) => (
          <Card key={comment.id}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                {comment.user.avatarUrl && (
                  <img
                    src={comment.user.avatarUrl}
                    alt={comment.user.username}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">
                      {comment.user.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{comment.content}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {commentList.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            暂无评论，快来抢沙发吧~
          </div>
        )}
      </div>
    </div>
  );
}
