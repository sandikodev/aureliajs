import { customElement, resolve } from 'aurelia';
import { IRouter } from '@aurelia/router';
import template from './overview-page.html';
import { formatCents } from '@aurelia-ops/shared/utils';

import { statusMeta } from '@/lib/status';
import { relativeTime } from '@/lib/utils';
import { api, emptyOverview, type Overview, type Period } from '@/services/api';
import { AuthService } from '@/services/auth';
import { I18nService } from '@/services/i18n';
import { ToastService } from '@/services/toast';
import { actionLabel as translateAction } from '@/lib/activity';

/**
 * Overview Page
 * ============
 * Main landing page after login.
 * Shows workspace KPIs, throughput chart, status breakdown, and recent activity.
 */
@customElement({ name: 'overview-page', template })
export class OverviewPage {
  private readonly auth = resolve(AuthService);
  private readonly router = resolve(IRouter);
  readonly i18n = resolve(I18nService);
  private readonly toast = resolve(ToastService);

  async openNewProject(): Promise<void> {
    await this.router.load('projects?new=true');
  }

  /**
   * The translator, exposed through a view-model getter so the binding
   * re-evaluates when the locale changes.
   */
  get t() {
    // Read the locale inside this observed getter so the binding is
    // registered as a dependency of it.
    this.i18n.track();
    return this.i18n.t;
  }

  /** The message catalog — see the note on `App.copy`. */
  get copy() {
    this.i18n.track();
    return this.i18n.strings;
  }

  /** The subtitle, with the workspace name interpolated. */
  get subtitleText(): string {
    this.i18n.track();
    return this.i18n.t('overview.subtitle', {
      workspace: this.auth.workspace?.name ?? this.i18n.t('app.workspaceFallback'),
    });
  }

  /** The chart's accessible name, with the trend delta interpolated. */
  get throughputSummary(): string {
    this.i18n.track();
    return this.i18n.t('overview.throughputSummary', { delta: this.trendDelta });
  }

  isLoading = true;
  loadError = false;
  overview: Overview = emptyOverview();

  /** The reporting window. Changing it re-queries the API. */
  period: Period = 'last-30';

  readonly periodOptions = [
    { value: 'last-7', label: this.i18n.t('overview.periodLast7') },
    { value: 'last-30', label: this.i18n.t('overview.periodLast30') },
    { value: 'quarter', label: this.i18n.t('overview.periodQuarter') },
  ];

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
    return rows.map((row) => {
      const meta = statusMeta(row.key);
      const percent = Math.round((row.value / total) * 100);
      return {
        ...row,
        label: meta.label,
        color: colors[row.key] ?? 'bg-muted',
        percent,
        style: `width: ${percent}%`,
        tooltip: `${meta.label}: ${row.value} (${percent}%)`,
      };
    });
  }

  /** The throughput series comes from the API — projects created per month. */
  get trend(): number[] {
    return this.overview.trend.map((point) => point.value);
  }

  get trendPoints(): Array<{ x: number; y: number }> {
    const width = 480;
    const height = 150;
    const series = this.trend;
    const max = Math.max(...series, 1);
    const step = width / Math.max(1, series.length - 1);
    return series.map((value, index) => ({
      x: Math.round(index * step),
      y: Math.round(height - (value / max) * (height - 20)),
    }));
  }

  get trendLine(): string {
    return this.trendPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
  }

  get trendArea(): string {
    const points = this.trendPoints;
    if (points.length === 0) return '';
    const last = points[points.length - 1];
    if (!last) return '';
    return `${this.trendLine} L${last.x} 160 L0 160 Z`;
  }

  get trendDelta(): number {
    const series = this.trend;
    const first = series[0] ?? 0;
    const last = series[series.length - 1] ?? first;
    if (first === 0) return last === 0 ? 0 : 100;
    return Math.round(((last - first) / first) * 100);
  }

  async attached(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.isLoading = true;
    try {
      this.overview = await api.overview(this.period);
      this.loadError = false;
    } catch {
      this.overview = emptyOverview(this.period);
      this.loadError = true;
    } finally {
      this.isLoading = false;
    }
  }

  /** Switch the reporting window — the numbers behind the cards follow. */
  async onPeriodChange(period: Period): Promise<void> {
    if (period === this.period) return;
    this.period = period;
    await this.load();
  }

  ago(iso: string): string {
    this.i18n.track();
    return relativeTime(iso, this.i18n.locale, this.i18n.t('common.justNow'));
  }

  actionLabel(action: string): string {
    return translateAction(this.i18n, action);
  }
}
