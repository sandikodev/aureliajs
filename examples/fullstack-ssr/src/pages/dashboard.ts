import { customElement, type ICustomElementViewModel } from 'aurelia';
import template from './dashboard.html';
import { dashboardStats, activityStream, type DashboardStats, type ActivityItem } from '../data.js';

@customElement({ name: 'dashboard-page', template: template as unknown as string })
export class DashboardPage implements ICustomElementViewModel {
  public static readonly title = 'Telemetry Dashboard - Aurelia 2 SSR';

  public static async loader(c: any) {
    return {
      stats: dashboardStats,
      activity: activityStream,
      user: c.get('user') ?? null,
      role: c.get('role') ?? null,
    };
  }

  public stats: DashboardStats = {
    title: 'Production Metrics',
    views: 0,
    posts: 0,
    engagement: 0,
  };
  public activity: ActivityItem[] = [];
  public user: { name?: string; email?: string } | null = null;
  public role: string | null = null;
  public loading = false;
  public error = '';

  public async refresh(): Promise<void> {
    if (typeof fetch === 'undefined') return;
    this.loading = true;
    this.error = '';
    try {
      const res = await fetch('/api/dashboard/stats', {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = (await res.json()) as { stats?: DashboardStats; activity?: ActivityItem[] };
      if (data.stats) this.stats = data.stats;
      if (data.activity) this.activity = data.activity;
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.loading = false;
    }
  }
}
