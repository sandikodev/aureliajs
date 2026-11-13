/**
 * Dashboard Page Component
 * 
 * Demonstrates:
 * - Protected route that requires authentication
 * - Data loading from multiple API endpoints (parallel execution)
 * - Server-side hydration with auth context
 * - Error handling with fallback UI
 */

import { customElement } from 'aurelia';
import template from './dashboard.html';
import { hydrateFromServer } from '@hono/aurelia-ssr';

export type DashboardStats = {
  title: string;
  views: number;
  posts: number;
  engagement: number;
};

export type ActivityItem = {
  id: number;
  type: 'post' | 'comment' | 'like';
  action: string;
  timestamp: string;
};

export type DashboardContext = {
  stats: DashboardStats;
  activity: ActivityItem[];
};

@customElement({ name: 'dashboard-page', template })
export class DashboardPage {
  stats: DashboardStats = {
    title: 'Loading...',
    views: 0,
    posts: 0,
    engagement: 0,
  };
  activity: ActivityItem[] = [];
  loading = false;
  error = '';

  /**
   * Attached lifecycle: Called when component is added to DOM.
   * Hydrate from server-side pre-loaded data if available.
   */
  attached() {
    // Try to hydrate from server
    const hydration = hydrateFromServer<DashboardContext>();

    if (hydration?.initialData) {
      // Server rendered and passed data
      this.stats = hydration.initialData.stats;
      this.activity = hydration.initialData.activity;
    } else {
      // Not hydrated, fetch if needed
      this.refresh();
    }
  }

  /**
   * Refresh dashboard data from server.
   * Executes stats and activity loaders in parallel.
   */
  async refresh() {
    this.loading = true;
    this.error = '';

    try {
      // Parallel execution of independent loaders
      const [statsRes, activityRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/activity'),
      ]);

      if (!statsRes.ok || !activityRes.ok) {
        throw new Error(`HTTP ${statsRes.status || activityRes.status}`);
      }

      const statsData = await statsRes.json();
      const activityData = await activityRes.json();

      this.stats = statsData.stats || statsData;
      this.activity = activityData.activity || activityData || [];
    } catch (err) {
      console.error('[dashboard-page] Failed to refresh:', err);
      this.error = err instanceof Error ? err.message : 'Failed to refresh dashboard';
    } finally {
      this.loading = false;
    }
  }

  /**
   * Format relative time (e.g., "2 hours ago").
   */
  relativeTime(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }

  /**
   * Get activity type emoji.
   */
  getActivityEmoji(type: string): string {
    const emojis: Record<string, string> = {
      post: '📝',
      comment: '💬',
      like: '❤️',
    };
    return emojis[type] || '📌';
  }
}
