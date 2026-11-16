import { customElement } from 'aurelia';
import template from './dashboard.html';
import type { DashboardStats, ActivityItem } from '../data.js';

export interface DashboardContext {
  stats: DashboardStats;
  activity: ActivityItem[];
}

@customElement({ name: 'dashboard-page', template })
export class DashboardPage {
  static title = 'Telemetry Dashboard - Aurelia 2 SSR';
  static requiresAuth = true;

  /**
   * Co-located route loader: executed on server during SSR and content-negotiation
   */
  static async loader() {
    const { dashboardStats, activityStream } = await import('../data.js');
    return {
      stats: dashboardStats,
      activity: activityStream,
    };
  }

  stats: DashboardStats = {
    title: 'Production Metrics',
    views: 0,
    posts: 0,
    engagement: 0,
  };
  activity: ActivityItem[] = [];
  user: { name?: string; email?: string } | null = null;
  role: string | null = null;
  loading = false;
  error = '';

  constructor(initialData?: DashboardContext) {
    if (initialData?.stats) {
      this.stats = initialData.stats;
    }
    if (initialData?.activity) {
      this.activity = initialData.activity;
    }
  }

  attached() {
    // If not hydrated from server (e.g. CSR navigation), fetch from API
    if (typeof window !== 'undefined' && !this.stats.views) {
      this.refresh();
    }
  }

  async refresh() {
    if (typeof fetch === 'undefined') return;
    this.loading = true;
    this.error = '';

    try {
      const [statsRes, activityRes] = await Promise.all([
        fetch('/api/dashboard/stats', { headers: { Accept: 'application/json' } }),
        fetch('/api/dashboard/activity', { headers: { Accept: 'application/json' } }),
      ]);

      if (statsRes.ok) this.stats = (await statsRes.json()) as DashboardStats;
      if (activityRes.ok) this.activity = (await activityRes.json()) as ActivityItem[];
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.loading = false;
    }
  }
}
