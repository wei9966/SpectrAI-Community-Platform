'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Bell,
  Star,
  Heart,
  MessageCircle,
  ThumbsUp,
  CheckCircle2,
  Users,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// 本地定义通知类型（shared 包未导出 TypeScript 类型）
interface NotificationWithSender {
  id: string;
  userId: string;
  type: 'comment' | 'reply' | 'like' | 'favorite' | 'rating' | 'mention' | 'system' | 'post' | 'best_answer';
  title: string;
  content: string | null;
  relatedId: string | null;
  relatedType: string | null;
  fromUserId: string | null;
  isRead: boolean;
  createdAt: Date;
  fromUser: {
    id: string;
    username: string;
    avatarUrl: string | null;
  } | null;
}

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationWithSender[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // 检查登录状态
  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('auth_token');

  // 获取通知
  const fetchNotifications = React.useCallback(async () => {
    if (!isLoggedIn) return;

    setIsLoading(true);
    try {
      // TODO: API 对接后替换为实际 API 调用
      // const response = await fetch('/api/notifications?unread=true&limit=5');
      // const data = await response.json();

      // Mock 数据
      const mockNotifications: NotificationWithSender[] = [
        {
          id: 'n1',
          userId: 'u1',
          type: 'rating',
          title: '收到评分',
          content: '您的资源获得了 5 星评分',
          relatedId: 'r1',
          relatedType: 'resource',
          fromUserId: 'u2',
          isRead: false,
          createdAt: new Date(Date.now() - 3 * 60 * 1000),
          fromUser: {
            id: 'u2',
            username: 'DataWizard',
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DataWizard',
          },
        },
        {
          id: 'n2',
          userId: 'u1',
          type: 'favorite',
          title: '收到收藏',
          content: 'DevMaster 收藏了您的资源',
          relatedId: 'r1',
          relatedType: 'resource',
          fromUserId: 'u3',
          isRead: false,
          createdAt: new Date(Date.now() - 15 * 60 * 1000),
          fromUser: {
            id: 'u3',
            username: 'DevMaster',
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DevMaster',
          },
        },
        {
          id: 'n3',
          userId: 'u1',
          type: 'reply',
          title: '新回复',
          content: 'AgentExpert 回复了您的帖子',
          relatedId: 'p1',
          relatedType: 'post',
          fromUserId: 'u4',
          isRead: false,
          createdAt: new Date(Date.now() - 30 * 60 * 1000),
          fromUser: {
            id: 'u4',
            username: 'AgentExpert',
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AgentExpert',
          },
        },
        {
          id: 'n4',
          userId: 'u1',
          type: 'like',
          title: '收到点赞',
          content: '您的内容收到了 10 个赞',
          relatedId: 'p1',
          relatedType: 'post',
          fromUserId: null,
          isRead: true,
          createdAt: new Date(Date.now() - 60 * 60 * 1000),
          fromUser: null,
        },
        {
          id: 'n5',
          userId: 'u1',
          type: 'best_answer',
          title: '最佳答案',
          content: '您的回复被标记为最佳答案',
          relatedId: 'p1',
          relatedType: 'post',
          fromUserId: 'u5',
          isRead: true,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          fromUser: {
            id: 'u5',
            username: 'TechLead',
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TechLead',
          },
        },
      ];

      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter((n) => !n.isRead).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  // 30 秒轮询
  React.useEffect(() => {
    if (!isLoggedIn) return;

    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isLoggedIn, fetchNotifications]);

  // 点击外部关闭
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 标记全部已读
  const handleMarkAllRead = async () => {
    try {
      // TODO: API 对接后调用 PATCH /api/notifications/read-all
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // 获取通知图标
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'rating':
        return <Star className="w-4 h-4 text-yellow-500" />;
      case 'favorite':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'reply':
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'like':
        return <ThumbsUp className="w-4 h-4 text-green-500" />;
      case 'best_answer':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'mention':
        return <Users className="w-4 h-4 text-purple-500" />;
      case 'system':
        return <Settings className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  // 相对时间
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

  // 跳转到相关页面
  const getNotificationHref = (notification: NotificationWithSender) => {
    if (!notification.relatedId) return '/notifications';

    switch (notification.relatedType) {
      case 'resource':
        return `/resource/${notification.relatedId}`;
      case 'post':
        return `/forum/post/${notification.relatedId}`;
      case 'user':
        return `/user/${notification.relatedId}`;
      default:
        return '/notifications';
    }
  };

  // 未登录不显示
  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* 下拉列表 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border bg-popover shadow-lg overflow-hidden z-50">
          {/* 头部 */}
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-semibold text-sm">通知</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-primary hover:text-primary"
                onClick={handleMarkAllRead}
              >
                全部已读
              </Button>
            )}
          </div>

          {/* 通知列表 */}
          <div className="max-h-[320px] overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={getNotificationHref(notification)}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-start gap-3 p-3 hover:bg-accent transition-colors border-l-2',
                    !notification.isRead ? 'border-l-primary bg-primary/5' : 'border-l-transparent'
                  )}
                >
                  {/* 图标 */}
                  <div className="flex-shrink-0 mt-0.5">
                    {notification.fromUser?.avatarUrl ? (
                      <img
                        src={notification.fromUser.avatarUrl}
                        alt={notification.fromUser.username}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                        {getNotificationIcon(notification.type)}
                      </div>
                    )}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getNotificationIcon(notification.type)}
                      <span className="text-sm font-medium truncate">
                        {notification.fromUser?.username || '系统'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {notification.content || notification.title}
                    </p>
                    <span className="text-xs text-muted-foreground mt-1 block">
                      {timeAgo(new Date(notification.createdAt))}
                    </span>
                  </div>

                  {/* 未读指示 */}
                  {!notification.isRead && (
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                  )}
                </Link>
              ))
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无通知</p>
              </div>
            )}
          </div>

          {/* 底部 */}
          <div className="p-2 border-t bg-muted/30">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="block w-full text-center text-sm text-primary hover:underline py-1"
            >
              查看全部通知
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
