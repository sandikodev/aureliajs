import { customElement, resolve } from 'aurelia';
import { IRequestContext } from '@hono/aurelia-ssr/client';
import template from './dashboard.html';
import type { DashboardStats, ActivityItem } from '../data.js';

export interface DashboardContext {
  stats: DashboardStats;
  activity: ActivityItem[];
}

@customElement({ name: 'dashboard-page', template })
export class DashboardPage {
  readonly req = resolve(IRequestContext);
  stats: DashboardStats = {
    title: 'Production Metrics',
    views: 0,
    posts: 0,
    engagement: 0,
  };
  activity: ActivityItem[] = [];
  loading = false;
  error = '';

  get user() {
    return this.req.user;
  }

  get role() {
    return this.req.role;
  }

  constructor(initialData?: DashboardContext) {
    if (initialData?.stats) {
      this.stats = initialData.stats;
    }
    if (initialData?.activity) {
      this.activity = initialData.activity;
    }
  }

  attached() {
    if (!this.stats.views && typeof window !== 'undefined') {
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
