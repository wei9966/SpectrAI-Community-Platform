'use client';

import * as React from 'react';
import {
  Bell,
  Star,
  Heart,
  MessageSquare,
  ThumbsUp,
  CheckCircle,
  AtSign,
  CheckCheck,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/Pagination';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

import { API_BASE } from '@/lib/api-base';

interface NotificationActor {
  username: string;
  avatarUrl: string | null;
}

interface Notification {
  id: string;
  type: 'reply' | 'vote' | 'favorite' | 'rating' | 'mention' | 'best_answer' | 'like' | 'comment' | 'system';
  title: string;
  content: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  actor: NotificationActor | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type FilterType = 'all' | 'unread' | 'read';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  return headers;
}

// Notification type icon mapping
function getNotificationIcon(type: string) {
  switch (type) {
    case 'reply':
      return <MessageSquare className="w-5 h-5 text-blue-500" />;
    case 'vote':
    case 'like':
      return <ThumbsUp className="w-5 h-5 text-green-500" />;
    case 'favorite':
      return <Heart className="w-5 h-5 text-red-500" />;
    case 'rating':
      return <Star className="w-5 h-5 text-yellow-500" />;
    case 'mention':
      return <AtSign className="w-5 h-5 text-purple-500" />;
    case 'best_answer':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'comment':
      return <MessageSquare className="w-5 h-5 text-blue-500" />;
    case 'system':
      return <Bell className="w-5 h-5 text-muted-foreground" />;
    default:
      return <Bell className="w-5 h-5 text-muted-foreground" />;
  }
}

// Notification type label mapping
function getTypeLabel(type: string): string {
  switch (type) {
    case 'reply': return '回复';
    case 'vote': return '投票';
    case 'like': return '点赞';
    case 'favorite': return '收藏';
    case 'rating': return '评分';
    case 'mention': return '@提及';
    case 'best_answer': return '最佳答案';
    case 'comment': return '评论';
    case 'system': return '系统';
    default: return type;
  }
}

// Notification type badge color mapping
function getTypeBadgeClasses(type: string): string {
  switch (type) {
    case 'reply':
    case 'comment':
      return 'bg-blue-500/10 text-blue-500';
    case 'vote':
    case 'like':
    case 'best_answer':
      return 'bg-green-500/10 text-green-500';
    case 'favorite':
      return 'bg-red-500/10 text-red-500';
    case 'rating':
      return 'bg-yellow-500/10 text-yellow-500';
    case 'mention':
      return 'bg-purple-500/10 text-purple-500';
    case 'system':
      return 'bg-secondary text-muted-foreground';
    default:
      return 'bg-secondary text-muted-foreground';
  }
}

// Relative time display
function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
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
}

// Loading skeleton component
function NotificationSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-muted" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-muted" />
                  <div className="h-4 w-24 rounded bg-muted" />
                </div>
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted" />
              </div>
              <div className="flex-shrink-0">
                <div className="h-6 w-14 rounded-full bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [filter, setFilter] = React.useState<FilterType>('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isMarkingAll, setIsMarkingAll] = React.useState(false);
  const [deletingIds, setDeletingIds] = React.useState<Set<string>>(new Set());
  const itemsPerPage = 20;

  // Fetch notifications from API
  const fetchNotifications = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === 'unread') params.set('isRead', 'false');
      if (filter === 'read') params.set('isRead', 'true');
      params.set('page', String(currentPage));
      params.set('limit', String(itemsPerPage));

      const response = await fetch(
        `${API_BASE}/api/notifications?${params.toString()}`,
        { headers: getAuthHeaders() }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setNotifications(result.data.items || []);
        setUnreadCount(result.data.unreadCount ?? 0);
        setPagination(result.data.pagination || null);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [filter, currentPage]);

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark a single notification as read
  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/notifications/${id}/read`,
        { method: 'PATCH', headers: getAuthHeaders() }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Click notification: mark as read and navigate
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }

    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/notifications/read-all`,
        { method: 'PATCH', headers: getAuthHeaders() }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Delete a single notification
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      const response = await fetch(
        `${API_BASE}/api/notifications/${id}`,
        { method: 'DELETE', headers: getAuthHeaders() }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Remove from local state
      const deleted = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (deleted && !deleted.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      // If we deleted the last item on a page, go back one page
      if (notifications.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const totalPages = pagination?.totalPages ?? 1;
  const totalItems = pagination?.total ?? notifications.length;
  const readCount = totalItems - unreadCount;

  return (
    <div className="container py-8 md:py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">通知中心</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `有 ${unreadCount} 条未读通知` : '暂无未读通知'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
          >
            {isMarkingAll ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4 mr-2" />
            )}
            全部标记已读
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <TabsPrimitive.Root
        value={filter}
        onValueChange={(v) => {
          setFilter(v as FilterType);
          setCurrentPage(1);
        }}
      >
        <TabsPrimitive.List className="flex border-b border-border mb-6">
          <TabsPrimitive.Trigger
            value="all"
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors relative',
              'text-muted-foreground hover:text-foreground',
              'data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary',
              '-mb-px'
            )}
          >
            全部
            <span className="ml-2 text-xs bg-secondary px-1.5 py-0.5 rounded-full">
              {totalItems}
            </span>
          </TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger
            value="unread"
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors relative',
              'text-muted-foreground hover:text-foreground',
              'data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary',
              '-mb-px'
            )}
          >
            未读
            {unreadCount > 0 && (
              <span className="ml-2 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger
            value="read"
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors relative',
              'text-muted-foreground hover:text-foreground',
              'data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary',
              '-mb-px'
            )}
          >
            已读
            <span className="ml-2 text-xs bg-secondary px-1.5 py-0.5 rounded-full">
              {readCount >= 0 ? readCount : 0}
            </span>
          </TabsPrimitive.Trigger>
        </TabsPrimitive.List>
      </TabsPrimitive.Root>

      {/* Notification list */}
      {isLoading ? (
        <NotificationSkeleton />
      ) : notifications.length > 0 ? (
        <>
          <div className="space-y-3 mb-6">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={cn(
                  'cursor-pointer transition-all hover:bg-accent/50 group',
                  !notification.isRead && 'border-l-4 border-l-primary bg-primary/5'
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Left: avatar or icon */}
                    <div className="flex-shrink-0">
                      {notification.actor?.avatarUrl ? (
                        <img
                          src={notification.actor.avatarUrl}
                          alt={notification.actor.username}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>
                      )}
                    </div>

                    {/* Middle: content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getNotificationIcon(notification.type)}
                        <span className="font-medium text-sm">
                          {notification.actor?.username || '系统通知'}
                        </span>
                        {!notification.isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.content || notification.title}
                      </p>
                      <span className="text-xs text-muted-foreground mt-1 block">
                        {timeAgo(notification.createdAt)}
                      </span>
                    </div>

                    {/* Right: type badge + delete button */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span
                        className={cn(
                          'text-xs px-2 py-1 rounded-full',
                          getTypeBadgeClasses(notification.type)
                        )}
                      >
                        {getTypeLabel(notification.type)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDelete(e, notification.id)}
                        disabled={deletingIds.has(notification.id)}
                      >
                        {deletingIds.has(notification.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      ) : (
        <Card className="py-16">
          <CardContent className="text-center">
            <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-2">暂无通知</p>
            <p className="text-sm text-muted-foreground">
              {filter === 'all'
                ? '收到通知后会在此处显示'
                : filter === 'unread'
                  ? '所有通知都已读'
                  : '暂无已读通知'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
