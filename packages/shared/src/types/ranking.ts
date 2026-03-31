/**
 * Ranking types for leaderboard system
 */

/**
 * Ranking period enumeration
 */
export enum RankingPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ALL_TIME = 'all_time',
}

/**
 * Single ranking item
 */
export interface RankingItem {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  score: number;
  resourceCount: number;
  totalDownloads: number;
  totalLikes: number;
  averageRating: number;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Ranking list response
 */
export interface RankingList {
  period: RankingPeriod;
  items: RankingItem[];
  totalUsers: number;
  generatedAt: Date;
}
