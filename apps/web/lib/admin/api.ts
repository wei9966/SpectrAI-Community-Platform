/**
 * Admin API client — talks to /api/admin/* endpoints.
 * Uses the same JWT token as the community app.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

async function adminFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = getToken();
  if (!token) throw new Error("未登录");

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "请求失败");
  }
  return json.data;
}

// ── Users ────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  bio: string | null;
  displayName: string | null;
  githubId: string | null;
  claudeopsUuid: string | null;
  claudeopsPlan: string | null;
  createdAt: string;
  updatedAt: string;
  resourceCount: number;
}

export interface UsersListResponse {
  items: AdminUser[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface UserDetail extends AdminUser {
  stats: {
    resourceCount: number;
    commentCount: number;
    forumPostCount: number;
    forumReplyCount: number;
    totalDownloads: number;
    totalLikes: number;
  };
}

export interface UserStats {
  total: number;
  byRole: Record<string, number>;
  newUsersLast7Days: number;
  githubLinked: number;
  claudeopsLinked: number;
}

export const adminUsersApi = {
  list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") qs.set(k, String(v));
      }
    }
    return adminFetch<UsersListResponse>(`/admin/users?${qs}`);
  },

  stats() {
    return adminFetch<UserStats>("/admin/users/stats");
  },

  getById(id: string) {
    return adminFetch<UserDetail>(`/admin/users/${id}`);
  },

  updateRole(id: string, role: string) {
    return adminFetch<{ message: string }>(`/admin/users/${id}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
  },

  delete(id: string) {
    return adminFetch<{ message: string }>(`/admin/users/${id}`, {
      method: "DELETE",
    });
  },
};

// ── Stats ────────────────────────────────────────────────────

export interface OverviewStats {
  totals: {
    users: number;
    resources: number;
    forumPosts: number;
    comments: number;
  };
  today: {
    newUsers: number;
    newResources: number;
    newPosts: number;
  };
  resources: {
    published: number;
    pendingReview: number;
  };
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface TrendsData {
  users: TrendPoint[];
  resources: TrendPoint[];
  forumPosts: TrendPoint[];
}

export interface ResourcesByType {
  byType: Array<{ type: string; total: number }>;
  byReviewStatus: Array<{ status: string; total: number }>;
  bySourceApp: Array<{ sourceApp: string; total: number }>;
}

export interface TopResource {
  id: string;
  name: string;
  type: string;
  downloads: number;
  likes: number;
  reviewStatus: string;
  isPublished: boolean;
  createdAt: string;
  authorUsername: string | null;
}

export interface TopUser {
  userId: string;
  username: string;
  avatarUrl: string | null;
  resourceCount: number;
  totalDownloads: number;
  totalLikes: number;
}

export interface ForumStats {
  totalCategories: number;
  totalPosts: number;
  totalReplies: number;
  pinnedPosts: number;
  lockedPosts: number;
  last7Days: {
    newPosts: number;
    newReplies: number;
  };
}

export const adminStatsApi = {
  overview() {
    return adminFetch<OverviewStats>("/admin/stats/overview");
  },

  trends(days = 30) {
    return adminFetch<TrendsData>(`/admin/stats/trends?days=${days}`);
  },

  resourcesByType() {
    return adminFetch<ResourcesByType>("/admin/stats/resources-by-type");
  },

  topResources(sort: "downloads" | "likes" = "downloads", limit = 10) {
    return adminFetch<TopResource[]>(
      `/admin/stats/top-resources?sort=${sort}&limit=${limit}`
    );
  },

  topUsers(sort: "resources" | "downloads" | "likes" = "resources", limit = 10) {
    return adminFetch<TopUser[]>(
      `/admin/stats/top-users?sort=${sort}&limit=${limit}`
    );
  },

  forum() {
    return adminFetch<ForumStats>("/admin/stats/forum");
  },
};

// ── Resources ─────────────────────────────────────────────────

export interface AdminResource {
  id: string;
  name: string;
  description: string;
  type: string;
  reviewStatus: string;
  isPublished: boolean;
  downloads: number;
  likes: number;
  version: string;
  sourceApp: string;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
}

export interface ResourcesListResponse {
  items: AdminResource[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const adminResourcesApi = {
  list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    reviewStatus?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") qs.set(k, String(v));
      }
    }
    return adminFetch<ResourcesListResponse>(`/admin/resources?${qs}`);
  },

  togglePublish(id: string, publish: boolean) {
    return adminFetch<{ message: string }>(`/admin/resources/${id}/publish`, {
      method: "PUT",
      body: JSON.stringify({ publish }),
    });
  },

  delete(id: string) {
    return adminFetch<{ message: string }>(`/admin/resources/${id}`, {
      method: "DELETE",
    });
  },
};

// ── Review ────────────────────────────────────────────────────

export interface ReviewItem {
  id: string;
  name: string;
  description: string;
  type: string;
  reviewStatus: "pending";
  author: { id: string; username: string; avatarUrl: string | null };
  version: string;
  createdAt: string;
}

export interface ReviewQueueResponse {
  items: ReviewItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const adminReviewApi = {
  pending(params?: { page?: number; limit?: number }) {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    return adminFetch<ReviewQueueResponse>(`/admin/review/pending?${qs}`);
  },

  getById(id: string) {
    return adminFetch<any>(`/admin/review/${id}`);
  },

  approve(id: string) {
    return adminFetch<{ message: string }>(`/admin/review/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  reject(id: string, note: string) {
    return adminFetch<{ message: string }>(`/admin/review/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  },
};
