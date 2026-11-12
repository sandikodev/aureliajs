import type { Project, ProjectStatus } from '@aureliajs/shared';
import type { ActivityItem, Overview, OverviewStats } from '@/services/api';

/**
 * Deterministic sample data used only when the API is not running.
 * The UI shows a banner when this is the case, so the demo never pretends
 * to be live data.
 */

const NAMES = [
  'Billing revamp',
  'Customer portal',
  'Onboarding flow',
  'Design system v2',
  'API gateway migration',
  'Reporting pipeline',
  'Checkout experiments',
  'Partner integrations',
  'SSO rollout',
  'Data warehouse sync',
  'Marketing site rebuild',
  'Mobile companion app',
];

const OWNERS = [
  'Ayu Prameswari',
  'Daniel Okafor',
  'Mira Sørensen',
  'Kenji Watanabe',
  'Sofia Rossi',
];

const STATUSES: ProjectStatus[] = ['active', 'active', 'planning', 'active', 'paused', 'done'];

const now = Date.now();
const iso = (offsetDays: number) => new Date(now + offsetDays * 86_400_000).toISOString();

export const DEMO_PROJECTS: Project[] = Array.from({ length: 48 }, (_, i) => {
  const status = STATUSES[i % STATUSES.length] as ProjectStatus;
  return {
    id: `demo-${i + 1}`,
    workspaceId: 'demo-workspace',
    name: `${NAMES[i % NAMES.length]} ${Math.floor(i / NAMES.length) + 1}`,
    status,
    budgetCents: (3200 + ((i * 137) % 42000)) * 100,
    dueDate: iso((i % 60) - 12).slice(0, 10),
    ownerName: OWNERS[i % OWNERS.length] as string,
    createdAt: iso(-(i + 4)),
    updatedAt: iso(-(i % 14)),
  };
});

export const DEMO_ACTIVITY: ActivityItem[] = [
  {
    id: 'a1',
    actorName: 'Ayu Prameswari',
    action: 'project.created',
    target: 'Billing revamp 4',
    createdAt: iso(-0.02),
  },
  {
    id: 'a2',
    actorName: 'Mira Sørensen',
    action: 'project.status_changed',
    target: 'Onboarding flow → active',
    createdAt: iso(-0.2),
  },
  {
    id: 'a3',
    actorName: 'Demo Operator',
    action: 'member.invited',
    target: 'kenji@northwind.test',
    createdAt: iso(-1),
  },
  {
    id: 'a4',
    actorName: 'Daniel Okafor',
    action: 'project.updated',
    target: 'Design system v2',
    createdAt: iso(-1.4),
  },
  {
    id: 'a5',
    actorName: 'Demo Operator',
    action: 'billing.plan_upgraded',
    target: 'free → pro',
    createdAt: iso(-3),
  },
];

export const DEMO_STATS: OverviewStats = (() => {
  const byStatus = (status: ProjectStatus) =>
    DEMO_PROJECTS.filter((p) => p.status === status).length;
  const today = new Date().toISOString().slice(0, 10);
  return {
    total: DEMO_PROJECTS.length,
    active: byStatus('active'),
    planning: byStatus('planning'),
    paused: byStatus('paused'),
    done: byStatus('done'),
    overdue: DEMO_PROJECTS.filter((p) => p.dueDate && p.dueDate < today && p.status !== 'done')
      .length,
    members: 4,
    budgetCents: DEMO_PROJECTS.reduce((sum, p) => sum + p.budgetCents, 0),
  };
})();

/** Twelve months of delivery volume, used only when the API is unreachable. */
const DEMO_TREND = [32, 41, 37, 52, 48, 63, 58, 74, 69, 83, 79, 96].map((value, index) => {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCMonth(date.getUTCMonth() - (11 - index));
  return { month: date.toISOString().slice(0, 7), value };
});

export const DEMO_OVERVIEW: Overview = {
  period: 'last-30',
  periodDays: 30,
  stats: DEMO_STATS,
  trend: DEMO_TREND,
  activity: DEMO_ACTIVITY,
};
