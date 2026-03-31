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
  CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/Pagination';
import * as TabsPrimitive from '@radix-ui/react-tabs';
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

type FilterType = 'all' | 'unread' | 'read';

export default function NotificationsPage() {
  const [notifications, setNotifications] = React.useState<NotificationWithSender[]>([]);
  const [filter, setFilter] = React.useState<FilterType>('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const itemsPerPage = 10;

  // 获取通知列表
  const fetchNotifications = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: API 对接后替换为实际 API 调用
      // const params = new URLSearchParams();
      // if (filter === 'unread') params.set('isRead', 'false');
      // if (filter === 'read') params.set('isRead', 'true');
      // params.set('page', String(currentPage));
      // params.set('limit', String(itemsPerPage));
      // const response = await fetch(`/api/notifications?${params}`);
      // const data = await response.json();

      // Mock 数据
      const mockNotifications: NotificationWithSender[] = [
        {
          id: 'n1',
          userId: 'u1',
          type: 'rating',
          title: '收到评分',
          content: 'DataWizard 评价了您的资源"AI 代码审查助手"',
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
          content: 'DevMaster 收藏了您的资源"多会话编排工作流"',
          relatedId: 'r2',
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
          content: 'AgentExpert 回复了您的帖子"如何使用 SpectrAI 构建多代理系统"',
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
          content: '您的帖子收到了 10 个赞',
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
          content: '您的回复被标记为帖子"【已解决】工作流执行失败怎么排查？"的最佳答案',
          relatedId: 'p2',
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
        {
          id: 'n6',
          userId: 'u1',
          type: 'mention',
          title: '@提及',
          content: 'CodeMaster 在帖子中提到了您',
          relatedId: 'p3',
          relatedType: 'post',
          fromUserId: 'u6',
          isRead: false,
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
          fromUser: {
            id: 'u6',
            username: 'CodeMaster',
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CodeMaster',
          },
        },
        {
          id: 'n7',
          userId: 'u1',
          type: 'comment',
          title: '新评论',
          content: 'NewbieDev 评论了您的资源"GitHub MCP Server"',
          relatedId: 'r3',
          relatedType: 'resource',
          fromUserId: 'u7',
          isRead: true,
          createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
          fromUser: {
            id: 'u7',
            username: 'NewbieDev',
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NewbieDev',
          },
        },
        {
          id: 'n8',
          userId: 'u1',
          type: 'system',
          title: '系统通知',
          content: '欢迎使用 SpectrAI 社区平台！',
          relatedId: null,
          relatedType: null,
          fromUserId: null,
          isRead: true,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          fromUser: null,
        },
      ];

      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter, currentPage]);

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // 过滤通知
  const filteredNotifications = React.useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.isRead);
    }
    if (filter === 'read') {
      return notifications.filter((n) => n.isRead);
    }
    return notifications;
  }, [notifications, filter]);

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNotifications = filteredNotifications.slice(startIndex, startIndex + itemsPerPage);

  // 标记单条已读并跳转
  const handleNotificationClick = async (notification: NotificationWithSender) => {
    if (!notification.isRead) {
      try {
        // TODO: API 对接后调用 PATCH /api/notifications/:id/read
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }

    // 跳转到相关页面
    const href = getNotificationHref(notification);
    window.location.href = href;
  };

  // 标记全部已读
  const handleMarkAllRead = async () => {
    try {
      // TODO: API 对接后调用 PATCH /api/notifications/read-all
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // 获取通知图标
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'rating':
        return <Star className="w-5 h-5 text-yellow-500" />;
      case 'favorite':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'reply':
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'like':
        return <ThumbsUp className="w-5 h-5 text-green-500" />;
      case 'best_answer':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'mention':
        return <Users className="w-5 h-5 text-purple-500" />;
      case 'system':
        return <Settings className="w-5 h-5 text-muted-foreground" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
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
    if (!notification.relatedId) return '#';

    switch (notification.relatedType) {
      case 'resource':
        return `/resource/${notification.relatedId}`;
      case 'post':
        return `/forum/post/${notification.relatedId}`;
      case 'user':
        return `/user/${notification.relatedId}`;
      default:
        return '#';
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="container py-8 md:py-12">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">通知中心</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `有 ${unreadCount} 条未读通知` : '暂无未读通知'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="w-4 h-4 mr-2" />
            全部标记已读
          </Button>
        )}
      </div>

      {/* 筛选 Tab */}
      <TabsPrimitive.Root value={filter} onValueChange={(v) => { setFilter(v as FilterType); setCurrentPage(1); }}>
        <TabsPrimitive.List className="flex border-b border-border mb-6">
          <TabsPrimitive.Trigger
            value="all"
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors relative",
              "text-muted-foreground hover:text-foreground",
              "data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary",
              "-mb-px"
            )}
          >
            全部
            <span className="ml-2 text-xs bg-secondary px-1.5 py-0.5 rounded-full">
              {notifications.length}
            </span>
          </TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger
            value="unread"
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors relative",
              "text-muted-foreground hover:text-foreground",
              "data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary",
              "-mb-px"
            )}
          >
            未读
            <span className="ml-2 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          </TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger
            value="read"
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors relative",
              "text-muted-foreground hover:text-foreground",
              "data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary",
              "-mb-px"
            )}
          >
            已读
            <span className="ml-2 text-xs bg-secondary px-1.5 py-0.5 rounded-full">
              {notifications.length - unreadCount}
            </span>
          </TabsPrimitive.Trigger>
        </TabsPrimitive.List>
      </TabsPrimitive.Root>

      {/* 通知列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <span className="text-muted-foreground">加载中...</span>
        </div>
      ) : paginatedNotifications.length > 0 ? (
        <>
          <div className="space-y-3 mb-6">
            {paginatedNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={cn(
                  'cursor-pointer transition-all hover:bg-accent/50',
                  !notification.isRead && 'border-l-4 border-l-primary bg-primary/5'
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* 左侧：图标或头像 */}
                    <div className="flex-shrink-0">
                      {notification.fromUser?.avatarUrl ? (
                        <img
                          src={notification.fromUser.avatarUrl}
                          alt={notification.fromUser.username}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>
                      )}
                    </div>

                    {/* 中间：内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getNotificationIcon(notification.type)}
                        <span className="font-medium text-sm">
                          {notification.fromUser?.username || '系统通知'}
                        </span>
                        {!notification.isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.content || notification.title}
                      </p>
                      <span className="text-xs text-muted-foreground mt-1 block">
                        {timeAgo(new Date(notification.createdAt))}
                      </span>
                    </div>

                    {/* 右侧：类型标签 */}
                    <div className="flex-shrink-0">
                      <span className={cn(
                        'text-xs px-2 py-1 rounded-full',
                        notification.type === 'rating' && 'bg-yellow-500/10 text-yellow-500',
                        notification.type === 'favorite' && 'bg-red-500/10 text-red-500',
                        notification.type === 'reply' && 'bg-blue-500/10 text-blue-500',
                        notification.type === 'like' && 'bg-green-500/10 text-green-500',
                        notification.type === 'best_answer' && 'bg-green-500/10 text-green-500',
                        notification.type === 'mention' && 'bg-purple-500/10 text-purple-500',
                        notification.type === 'comment' && 'bg-blue-500/10 text-blue-500',
                        notification.type === 'system' && 'bg-secondary text-muted-foreground',
                      )}>
                        {notification.type === 'best_answer' ? '最佳答案' :
                         notification.type === 'rating' ? '评分' :
                         notification.type === 'favorite' ? '收藏' :
                         notification.type === 'reply' ? '回复' :
                         notification.type === 'comment' ? '评论' :
                         notification.type === 'like' ? '点赞' :
                         notification.type === 'mention' ? '@提及' :
                         notification.type === 'system' ? '系统' : notification.type}
                      </span>
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
              {filter === 'all' ? '收到通知后会在此处显示' :
               filter === 'unread' ? '所有通知都已读' : '暂无已读通知'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
