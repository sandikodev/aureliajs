import { customElement } from 'aurelia';
import template from './dashboard-page.html';
import { formatCents } from '@aureliajs/shared';
import { DEMO_OVERVIEW } from '@/lib/demo-data';
import { statusMeta } from '@/lib/status';
import { relativeTime } from '@/lib/utils';
import { api, type Overview } from '@/services/api';

const TREND = [32, 41, 37, 52, 48, 63, 58, 74, 69, 83, 79, 96];

@customElement({ name: 'dashboard-page', template })
export class DashboardPage {
  isLoading = true;
  demo = false;
  error = '';
  overview: Overview = DEMO_OVERVIEW;

  get stats() {
    return this.overview.stats;
  }

  get budgetLabel(): string {
    return formatCents(this.stats.budgetCents);
  }

  get statusBreakdown() {
    const total = Math.max(this.stats.total, 1);
    const rows = [
      { key: 'active' as const, value: this.stats.active },
      { key: 'planning' as const, value: this.stats.planning },
      { key: 'paused' as const, value: this.stats.paused },
      { key: 'done' as const, value: this.stats.done },
    ];
    const colors: Record<string, string> = {
      active: 'bg-emerald-500',
      planning: 'bg-sky-500',
      paused: 'bg-amber-500',
      done: 'bg-muted-foreground/60',
    };
    return rows.map((row) => ({
      ...row,
      label: statusMeta(row.key).label,
      color: colors[row.key],
      percent: Math.round((row.value / total) * 100),
    }));
  }

  get trendPoints(): Array<{ x: number; y: number }> {
    const width = 480;
    const height = 150;
    const max = Math.max(...TREND);
    const step = width / (TREND.length - 1);
    return TREND.map((value, index) => ({
      x: Math.round(index * step),
      y: Math.round(height - (value / max) * (height - 20)),
    }));
  }

  get trendLine(): string {
    return this.trendPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
  }

  get trendArea(): string {
    const points = this.trendPoints;
    const last = points[points.length - 1]!;
    return `${this.trendLine} L${last.x} 160 L0 160 Z`;
  }

  get trendDelta(): number {
    const first = TREND[0] ?? 1;
    const last = TREND[TREND.length - 1] ?? first;
    return Math.round(((last - first) / first) * 100);
  }

  async attached(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.isLoading = true;
    this.error = '';
    try {
      this.overview = await api.overview();
      this.demo = false;
    } catch {
      this.overview = DEMO_OVERVIEW;
      this.demo = true;
      this.error = '';
    } finally {
      this.isLoading = false;
    }
  }

  ago(iso: string): string {
    return relativeTime(iso);
  }

  actionLabel(action: string): string {
    const map: Record<string, string> = {
      'project.created': 'created a project',
      'project.updated': 'updated a project',
      'project.deleted': 'deleted a project',
      'project.status_changed': 'changed a status',
      'member.invited': 'invited a teammate',
      'billing.plan_upgraded': 'upgraded the plan',
    };
    return map[action] ?? action;
  }
}
