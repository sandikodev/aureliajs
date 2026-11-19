import { customElement, resolve } from 'aurelia';
import { IRouter } from '@aurelia/router';
import template from './overview-page.html';
import { formatCents } from '@aurelia-ops/shared/utils';
import { DEMO_OVERVIEW } from '@/lib/demo-data';
import { statusMeta } from '@/lib/status';
import { relativeTime } from '@/lib/utils';
import { api, type Overview, type Period } from '@/services/api';
import { AuthService } from '@/services/auth';
import { I18nService } from '@/services/i18n';
import { ToastService } from '@/services/toast';

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
  demo = false;
  overview: Overview = DEMO_OVERVIEW;

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
    return rows.map((row) => ({
      ...row,
      label: statusMeta(row.key).label,
      color: colors[row.key],
      percent: Math.round((row.value / total) * 100),
    }));
  }

  /**
   * The throughput series comes from the API — projects created per month.
   * The demo fallback keeps the same shape so the chart renders either way.
   */
  get trend(): number[] {
    const series = this.overview.trend;
    if (!series || series.length === 0) return DEMO_OVERVIEW.trend.map((point) => point.value);
    return series.map((point) => point.value);
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
    const last = points[points.length - 1]!;
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
      this.demo = false;
    } catch {
      this.overview = DEMO_OVERVIEW;
      this.demo = true;
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
    return relativeTime(iso);
  }

  actionLabel(action: string): string {
    const map: Record<string, string> = {
      'project.created': 'created a project',
      'project.updated': 'updated a project',
      'project.deleted': 'deleted a project',
      'project.status_changed': 'changed a status',
      'member.invited': 'invited a teammate',
      'member.invite_accepted': 'accepted an invitation',
      'member.role_changed': 'changed a role',
      'member.removed': 'removed a member',
      'billing.checkout_started': 'started a checkout',
      'billing.plan_activated': 'activated a plan',
      'billing.plan_changed': 'changed the plan',
      'billing.invoice_paid': 'paid an invoice',
      'billing.invoice_failed': 'had a failed invoice',
      'workspace.updated': 'updated the workspace',
      'workspace.created': 'created a workspace',
    };
    return map[action] ?? action;
  }
}
