import { customElement } from 'aurelia';
import { hydrateFromServer } from '@hono/aurelia-ssr/client';
import template from './dashboard.html';
import type { DashboardStats, ActivityItem } from '../data.js';

export interface DashboardContext {
  stats: DashboardStats;
  activity: ActivityItem[];
}

@customElement({ name: 'dashboard-page', template })
export class DashboardPage {
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
    const hydration = hydrateFromServer<DashboardContext>();
    if (hydration?.initialData) {
      if (hydration.initialData.stats) this.stats = hydration.initialData.stats;
      if (hydration.initialData.activity) this.activity = hydration.initialData.activity;
      if (hydration.context?.user) this.user = hydration.context.user;
      if (hydration.context?.role) this.role = hydration.context.role;
    } else if (typeof window !== 'undefined') {
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
