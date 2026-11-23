import { hash } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { getDb, closeDb, schema } from './client';

const DEMO_EMAIL = process.env.SEED_EMAIL ?? 'demo@aureliajs.dev';
const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'demo-password-123';
const WORKSPACE_NAME = 'Northwind Studio';
const WORKSPACE_SLUG = 'northwind';

const owners = [
  'Ayu Prameswari',
  'Daniel Okafor',
  'Mira Sørensen',
  'Kenji Watanabe',
  'Sofia Rossi',
];
const projectNames = [
  'Billing revamp',
  'Customer portal',
  'Onboarding flow',
  'Design system v2',
  'API gateway migration',
  'Mobile companion app',
  'Reporting pipeline',
  'Checkout experiments',
  'Partner integrations',
  'SSO rollout',
  'Data warehouse sync',
  'Marketing site rebuild',
];
const statuses = ['planning', 'active', 'paused', 'done'] as const;

function pick<T>(list: readonly T[], i: number): T {
  return list[i % list.length] as T;
}

const statusWeights: readonly (typeof statuses)[number][] = [
  'active',
  'active',
  'active',
  'planning',
  'planning',
  'paused',
  'done',
];

const db = getDb();

const existing = await db
  .select({ id: schema.workspaces.id })
  .from(schema.workspaces)
  .where(eq(schema.workspaces.slug, WORKSPACE_SLUG))
  .limit(1);

let workspaceId = existing[0]?.id;

if (!workspaceId) {
  const [workspace] = await db
    .insert(schema.workspaces)
    .values({
      name: WORKSPACE_NAME,
      slug: WORKSPACE_SLUG,
      plan: 'pro',
    })
    .returning({ id: schema.workspaces.id });
  workspaceId = workspace!.id;
}

const userExisting = await db
  .select({ id: schema.users.id })
  .from(schema.users)
  .where(eq(schema.users.email, DEMO_EMAIL))
  .limit(1);

let userId = userExisting[0]?.id;

if (!userId) {
  const passwordHash = await hash(DEMO_PASSWORD, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  const [user] = await db
    .insert(schema.users)
    .values({ email: DEMO_EMAIL, name: 'Demo Operator', passwordHash })
    .returning({ id: schema.users.id });
  userId = user!.id;
}

await db
  .insert(schema.memberships)
  .values({ workspaceId, userId, role: 'owner' })
  .onConflictDoNothing();

const invited = [
  { email: 'ayu@northwind.test', name: 'Ayu Prameswari' },
  { email: 'daniel@northwind.test', name: 'Daniel Okafor' },
  { email: 'mira@northwind.test', name: 'Mira Sørensen' },
];

for (const person of invited) {
  const found = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, person.email))
    .limit(1);
  let id = found[0]?.id;
  if (!id) {
    const passwordHash = await hash('demo-password-123', { memoryCost: 19456, timeCost: 2 });
    const [created] = await db
      .insert(schema.users)
      .values({ email: person.email, name: person.name, passwordHash })
      .returning({ id: schema.users.id });
    id = created!.id;
  }
  await db
    .insert(schema.memberships)
    .values({ workspaceId, userId: id, role: person.email.startsWith('ayu') ? 'admin' : 'member' })
    .onConflictDoNothing();
}

const count = await db.$count(schema.projects);

if (count < 100) {
  const now = Date.now();
  const rows: Array<{
    workspaceId: string;
    name: string;
    status: (typeof statusWeights)[number];
    budgetCents: number;
    dueDate: string;
    ownerName: string;
    createdBy: string;
  }> = [];

  for (let index = 0; index < 1000; index++) {
    const name = `${pick(projectNames, index)} ${Math.floor(index / projectNames.length) + 1}`;
    const status = pick(statusWeights, index + 3);
    const dueOffsetDays = (index % 90) - 20;
    rows.push({
      workspaceId,
      name,
      status,
      budgetCents: (2500 + ((index * 137) % 48000)) * 100,
      dueDate: new Date(now + dueOffsetDays * 86_400_000).toISOString().slice(0, 10),
      ownerName: pick(owners, index * 3 + 1),
      createdBy: userId,
    });
  }

  for (let i = 0; i < rows.length; i += 200) {
    await db.insert(schema.projects).values(rows.slice(i, i + 200));
  }

  await db.insert(schema.auditLogs).values([
    {
      workspaceId,
      actorName: 'Ayu Prameswari',
      action: 'project.created',
      target: 'Billing revamp 4',
    },
    {
      workspaceId,
      actorName: 'Demo Operator',
      action: 'member.invited',
      target: 'mira@northwind.test',
    },
    {
      workspaceId,
      actorName: 'Daniel Okafor',
      action: 'project.status_changed',
      target: 'Onboarding flow 2 → active',
    },
    {
      workspaceId,
      actorName: 'Demo Operator',
      action: 'billing.plan_upgraded',
      target: 'free → pro',
    },
    {
      workspaceId,
      actorName: 'Mira Sørensen',
      action: 'project.updated',
      target: 'Design system v2',
    },
  ]);
}

console.log(`✔ seeded workspace "${WORKSPACE_SLUG}" — login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
await closeDb();
