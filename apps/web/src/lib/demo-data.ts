import type { BillingOverview, MembersResponse, Project, ProjectStatus } from '@aurelia-ops/shared';
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

const demoProjectList: Project[] = [];
for (let i = 0; i < 48; i++) {
  const status = STATUSES[i % STATUSES.length] as ProjectStatus;
  demoProjectList.push({
    id: `demo-${i + 1}`,
    workspaceId: 'demo-workspace',
    name: `${NAMES[i % NAMES.length]} ${Math.floor(i / NAMES.length) + 1}`,
    status,
    budgetCents: (3200 + ((i * 137) % 42000)) * 100,
    dueDate: iso((i % 60) - 12).slice(0, 10),
    ownerName: OWNERS[i % OWNERS.length] as string,
    createdAt: iso(-(i + 4)),
    updatedAt: iso(-(i % 14)),
  });
}
export const DEMO_PROJECTS: Project[] = demoProjectList;

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

export const DEMO_MEMBERS: MembersResponse = {
  members: [
    {
      id: 'demo-u1',
      name: 'Demo Operator',
      email: 'demo@northwind.test',
      avatarUrl: null,
      role: 'owner',
      status: 'active',
      joinedAt: iso(-60),
    },
    {
      id: 'demo-u2',
      name: 'Ayu Prameswari',
      email: 'ayu@northwind.test',
      avatarUrl: null,
      role: 'admin',
      status: 'active',
      joinedAt: iso(-45),
    },
    {
      id: 'demo-u3',
      name: 'Daniel Okafor',
      email: 'daniel@northwind.test',
      avatarUrl: null,
      role: 'member',
      status: 'active',
      joinedAt: iso(-30),
    },
    {
      id: 'demo-u4',
      name: 'Mira Sørensen',
      email: 'mira@northwind.test',
      avatarUrl: null,
      role: 'member',
      status: 'active',
      joinedAt: iso(-15),
    },
  ],
  seatLimit: 10,
  seatUsed: 4,
  memberCount: 4,
  pendingInvites: 0,
};

export const DEMO_BILLING: BillingOverview = {
  plan: 'pro',
  limits: { projects: 5000, seats: 10 },
  usage: { projects: 48, seats: 4 },
  subscription: {
    status: 'active',
    currentPeriodEnd: iso(24),
    cancelAtPeriodEnd: false,
  },
  availablePrices: {
    monthly: true,
    yearly: true,
    scale: true,
  },
  invoices: [
    {
      id: 'inv_demo_001',
      date: iso(-6),
      amountCents: 2900,
      status: 'paid',
      invoiceUrl: null,
    },
    {
      id: 'inv_demo_002',
      date: iso(-36),
      amountCents: 2900,
      status: 'paid',
      invoiceUrl: null,
    },
  ],
};
