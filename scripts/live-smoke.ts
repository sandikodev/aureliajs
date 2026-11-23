/**
 * Live production smoke suite for the Vercel deployment.
 *
 * It exercises every API surface the SPA uses, the SPA fallback itself, and
 * the two external services the app depends on (Neon Postgres via a direct
 * connection check, and Stripe via checkout/portal/webhook).
 *
 * Read-only checks always run. Mutating checks are opt-in so a casual run can
 * never change production data:
 *
 *   LIVE_BASE_URL=https://aureliajs.vercel.app \
 *   LIVE_EMAIL=demo@aureliajs.dev LIVE_PASSWORD=... \
 *   bun scripts/live-smoke.ts
 *
 *   # Full suite, including writes, Resend email delivery and signed webhooks:
 *   NEON_DIRECT_URL='postgresql://...' STRIPE_WEBHOOK_SECRET='whsec_...' \
 *   RESEND_API_KEY='re_...' LIVE_RESEND_TEST_EMAIL='owner@example.com' \
 *   LIVE_WRITE=1 bun scripts/live-smoke.ts
 *
 * NEVER put credentials in this file. Read them from the environment (for
 * example `vercel env pull` into a temp file, then `set -a; source ...`).
 */
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import postgres from 'postgres';

const BASE = (process.env.LIVE_BASE_URL ?? 'https://aureliajs.vercel.app').replace(/\/$/, '');
const EMAIL = process.env.LIVE_EMAIL ?? 'demo@aureliajs.dev';
const PASSWORD = process.env.LIVE_PASSWORD ?? 'demo-password-123';
const WRITE = process.env.LIVE_WRITE === '1';
const DIRECT_URL = process.env.NEON_DIRECT_URL;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_TEST_EMAIL = process.env.LIVE_RESEND_TEST_EMAIL;
const RUN = Date.now().toString(36);

type Status = 'PASS' | 'FAIL' | 'SKIP';
type Result = { name: string; status: Status; detail?: string };
const results: Result[] = [];

async function check(name: string, fn: () => Promise<string | void>): Promise<void> {
  try {
    const detail = await fn();
    results.push({ name, status: 'PASS', detail });
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    results.push({ name, status: 'FAIL', detail });
    console.log(`  FAIL  ${name} — ${detail}`);
  }
}

function skip(name: string, why: string): void {
  results.push({ name, status: 'SKIP', detail: why });
  console.log(`  SKIP  ${name} — ${why}`);
}

/* ------------------------------------------------------------------ */
/* HTTP client with an isolated cookie jar per "browser"                */
/* ------------------------------------------------------------------ */

type Response = {
  status: number;
  text: string;
  // biome-ignore lint/suspicious/noExplicitAny: parsed JSON is intentionally untyped here
  json: any;
  headers: Headers;
};

function client() {
  const jar = new Map<string, string>();

  async function request(
    path: string,
    opts: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
  ): Promise<Response> {
    const headers: Record<string, string> = { ...opts.headers };
    const cookies = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    if (cookies) headers.cookie = cookies;
    if (opts.body !== undefined) headers['content-type'] = 'application/json';

    const res = await fetch(`${BASE}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      redirect: 'manual',
    });

    for (const raw of res.headers.getSetCookie?.() ?? []) {
      const pair = raw.split(';')[0] ?? '';
      const sep = pair.indexOf('=');
      if (sep > 0) jar.set(pair.slice(0, sep), pair.slice(sep + 1));
    }

    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      json = undefined;
    }
    return { status: res.status, text, json, headers: res.headers };
  }

  return { jar, request };
}

const owner = client();

function expectStatus(res: Response, status: number, label: string): void {
  assert.equal(res.status, status, `${label}: HTTP ${res.status} — ${res.text.slice(0, 240)}`);
}

function stripeSignature(payload: string, secret: string): string {
  // stripe-node uses the signing secret verbatim as the HMAC key (it does NOT
  // base64-decode the `whsec_` suffix). Signing `${timestamp}.${rawBody}` with
  // the raw string is exactly what `generateTestHeaderString` does.
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return `t=${timestamp},v1=${digest}`;
}

/* ------------------------------------------------------------------ */
/* 1. Static SPA + infrastructure                                       */
/* ------------------------------------------------------------------ */

console.log(`\nLive smoke: ${BASE}  (run ${RUN})`);
console.log('\n[1] SPA + infrastructure');

await check('SPA root serves the app shell', async () => {
  const res = await owner.request('/');
  expectStatus(res, 200, 'GET /');
  assert.match(res.text, /<app-root/i);
  return 'index.html';
});

for (const path of ['overview', 'projects', 'members', 'billing', 'settings', 'login', 'invite']) {
  await check(`SPA deep link /${path} falls back to index.html`, async () => {
    const res = await owner.request(`/${path}`);
    expectStatus(res, 200, `GET /${path}`);
    assert.match(res.text, /<app-root/i);
  });
}

await check('GET /api/health reports the service', async () => {
  const res = await owner.request('/api/health');
  expectStatus(res, 200, 'health');
  assert.equal(res.json.ok, true);
  assert.equal(res.json.service, 'aureliajs-api');
  return `v${res.json.version} / ${res.json.environment}`;
});

await check('GET /api/ready reports the database as up', async () => {
  const res = await owner.request('/api/ready');
  expectStatus(res, 200, 'ready');
  assert.equal(res.json.ok, true);
  assert.equal(res.json.db, 'up');
});

/* ------------------------------------------------------------------ */
/* 2. Auth + authorization boundaries                                  */
/* ------------------------------------------------------------------ */

console.log('\n[2] Auth + authorization');

await check('GET /api/auth/me without a session returns null user', async () => {
  const anonymous = client();
  const res = await anonymous.request('/api/auth/me');
  expectStatus(res, 200, 'anonymous me');
  assert.equal(res.json.user, null);
  assert.equal(res.json.workspace, null);
});

for (const path of [
  '/api/overview',
  '/api/projects',
  '/api/members',
  '/api/billing',
  '/api/workspaces/current',
]) {
  await check(`GET ${path} is 401 without a session`, async () => {
    const anonymous = client();
    const res = await anonymous.request(path);
    expectStatus(res, 401, path);
    assert.equal(res.json.error?.code, 'unauthorized');
  });
}

await check('POST /api/auth/login validates its payload (422)', async () => {
  const res = await owner.request('/api/auth/login', {
    method: 'POST',
    body: { email: 'not-an-email', password: 'short' },
  });
  expectStatus(res, 422, 'invalid login');
  assert.equal(res.json.error?.code, 'validation_failed');
});

await check('wrong password and unknown email return the same 401', async () => {
  const wrong = await owner.request('/api/auth/login', {
    method: 'POST',
    body: { email: EMAIL, password: 'definitely-wrong-password' },
  });
  const unknown = await owner.request('/api/auth/login', {
    method: 'POST',
    body: { email: `nobody-${RUN}@example.com`, password: 'definitely-wrong-password' },
  });
  expectStatus(wrong, 401, 'wrong password');
  expectStatus(unknown, 401, 'unknown email');
  assert.equal(wrong.json.error?.code, 'unauthorized');
  assert.equal(
    wrong.json.error?.message,
    unknown.json.error?.message,
    'login must not enumerate users',
  );
});

await check('demo login succeeds and sets a hardened session cookie', async () => {
  const res = await owner.request('/api/auth/login', {
    method: 'POST',
    body: { email: EMAIL, password: PASSWORD },
  });
  expectStatus(res, 200, 'login');
  assert.equal(res.json.user?.email, EMAIL);
  assert.ok(res.json.workspace, 'login must resolve a workspace');
  assert.equal(res.json.role, 'owner');
  const raw = res.headers.getSetCookie?.().join('; ') ?? '';
  assert.match(raw, /HttpOnly/i, 'cookie must be HttpOnly');
  assert.match(raw, /Secure/i, 'cookie must be Secure in production');
  assert.match(raw, /SameSite=Lax/i, 'cookie should be SameSite=Lax');
  return `workspace ${res.json.workspace.slug} as ${res.json.role}`;
});

const workspaceId: string = (await owner.request('/api/auth/me')).json.workspace?.id;
assert.ok(workspaceId, 'login did not yield a workspace id');

await check('GET /api/auth/me with the session returns the signed-in user', async () => {
  const res = await owner.request('/api/auth/me');
  expectStatus(res, 200, 'me');
  assert.equal(res.json.user?.email, EMAIL);
  assert.equal(res.json.workspace?.id, workspaceId);
});

/* ------------------------------------------------------------------ */
/* 3. Read-only feature surface                                        */
/* ------------------------------------------------------------------ */

console.log('\n[3] Dashboard, projects, team, workspaces, billing');

await check('workspaces list contains the active workspace', async () => {
  const res = await owner.request('/api/workspaces');
  expectStatus(res, 200, 'workspaces');
  assert.ok(res.json.workspaces.some((w: { isActive: boolean }) => w.isActive));
  assert.equal(res.json.activeWorkspaceId, workspaceId);
});

await check('GET /api/workspaces/current returns parsed settings', async () => {
  const res = await owner.request('/api/workspaces/current');
  expectStatus(res, 200, 'current workspace');
  assert.equal(res.json.id, workspaceId);
  assert.ok(res.json.settings && typeof res.json.settings.locale === 'string');
});

await check('GET /api/members returns members and seat accounting', async () => {
  const res = await owner.request('/api/members');
  expectStatus(res, 200, 'members');
  assert.ok(Array.isArray(res.json.members));
  assert.ok(res.json.memberCount >= 1);
  assert.ok(res.json.seatUsed >= res.json.memberCount);
  return `${res.json.memberCount} member(s), ${res.json.seatUsed}/${res.json.seatLimit} seats`;
});

await check('GET /api/invites is available to the owner', async () => {
  const res = await owner.request('/api/invites');
  expectStatus(res, 200, 'invites');
  assert.ok(Array.isArray(res.json));
});

await check('overview honours every period and rejects invalid values', async () => {
  const days: Record<string, number> = { 'last-7': 7, 'last-30': 30, quarter: 90 };
  for (const [period, expected] of Object.entries(days)) {
    const res = await owner.request(`/api/overview?period=${period}`);
    expectStatus(res, 200, `overview ${period}`);
    assert.equal(res.json.periodDays, expected);
    assert.ok(res.json.stats && Array.isArray(res.json.trend));
  }
  const bad = await owner.request('/api/overview?period=decade');
  expectStatus(bad, 422, 'invalid period');
});

await check('projects pagination, sorting, filtering and search', async () => {
  const page = await owner.request('/api/projects?page=1&pageSize=5&sort=budget');
  expectStatus(page, 200, 'projects page');
  assert.equal(page.json.pageSize, 5);
  assert.ok(page.json.total > 0, 'expected seeded projects in Neon');
  assert.ok(page.json.items.length <= 5);
  const budgets = page.json.items.map((p: { budgetCents: number }) => p.budgetCents);
  assert.deepEqual(
    budgets,
    [...budgets].sort((a, b) => b - a),
    'budget sort must be descending',
  );

  const active = await owner.request('/api/projects?status=active&pageSize=100');
  expectStatus(active, 200, 'status filter');
  assert.ok(
    active.json.items.every((p: { status: string }) => p.status === 'active'),
    'status filter leaked other statuses',
  );

  const searched = await owner.request('/api/projects?q=Billing');
  expectStatus(searched, 200, 'search');
  assert.ok(searched.json.items.length > 0, 'search should match the seeded "Billing revamp"');

  const bad = await owner.request('/api/projects?page=0');
  expectStatus(bad, 422, 'invalid page');
  return `${page.json.total} projects total`;
});

await check('billing overview exposes plan, limits, usage and price flags', async () => {
  const res = await owner.request('/api/billing');
  expectStatus(res, 200, 'billing');
  assert.ok(['free', 'pro', 'scale'].includes(res.json.plan));
  assert.ok(Array.isArray(res.json.invoices));
  assert.equal(res.json.availablePrices.monthly, true, 'monthly price must be configured in prod');
  assert.equal(res.json.availablePrices.yearly, true, 'yearly price must be configured in prod');
  assert.equal(res.json.availablePrices.scale, true, 'scale price must be configured in prod');
  return `plan=${res.json.plan}, ${res.json.usage.projects} projects, ${res.json.usage.seats} seats`;
});

await check('Stripe portal creates a real billing-portal session', async () => {
  const res = await owner.request('/api/billing/portal', { method: 'POST' });
  expectStatus(res, 200, 'portal');
  assert.match(res.json.url, /^https:\/\/billing\.stripe\.com/);
  return 'https://billing.stripe.com session';
});

for (const [plan, interval] of [
  ['pro', 'monthly'],
  ['pro', 'yearly'],
  ['scale', 'monthly'],
  ['scale', 'yearly'],
] as const) {
  await check(`a real Stripe Checkout Session is created for ${plan}/${interval}`, async () => {
    const res = await owner.request('/api/billing/checkout', {
      method: 'POST',
      body: { plan, interval },
    });
    expectStatus(res, 201, `checkout ${plan}/${interval}`);
    assert.match(res.json.url, /^https:\/\/checkout\.stripe\.com/);
    return 'https://checkout.stripe.com session';
  });
}

await check('webhook rejects missing and invalid signatures with 400', async () => {
  const missing = await owner.request('/api/billing/webhook', { method: 'POST', body: {} });
  expectStatus(missing, 400, 'missing signature');
  assert.equal(missing.json.error?.code, 'missing_signature');

  const forged = await owner.request('/api/billing/webhook', {
    method: 'POST',
    body: { id: 'evt_forged', type: 'invoice.paid' },
    headers: { 'stripe-signature': 't=1,v1=deadbeef' },
  });
  expectStatus(forged, 400, 'invalid signature');
  assert.equal(forged.json.error?.code, 'invalid_signature');
});

/* ------------------------------------------------------------------ */
/* 4. Direct Neon check — proves the API is not serving mock data      */
/* ------------------------------------------------------------------ */

console.log('\n[4] Direct Neon connection');

let direct: Awaited<ReturnType<typeof postgres>> | undefined;
if (DIRECT_URL) {
  await check('direct connection reaches Neon and row counts match the API', async () => {
    direct = postgres(DIRECT_URL, { prepare: false, max: 1, connect_timeout: 10 });
    const [info] = await direct`select current_database() as db, version() as ver`;
    const [counts] = await direct`
      select
        (select count(*) from workspaces)::int as workspaces,
        (select count(*) from users)::int as users,
        (select count(*) from projects)::int as projects,
        (select count(*) from memberships)::int as memberships,
        (select count(*) from stripe_events)::int as stripe_events
    `;
    const [scoped] =
      await direct`select count(*)::int as n from projects where workspace_id = ${workspaceId}`;
    const api = await owner.request('/api/projects?pageSize=1');
    assert.equal(
      Number(scoped.n),
      Number(api.json.total),
      'API total must equal the Neon row count',
    );
    assert.ok(counts.workspaces >= 1 && counts.users >= 1 && counts.projects >= 1);
    const host = new URL(DIRECT_URL).hostname;
    assert.match(host, /neon\.tech$/, 'direct URL must point at Neon');
    return `${host.replace(/^ep-[^-]+-/, 'ep-***-')} · ${info.db} · ${counts.projects} projects · ${counts.users} users`;
  });
} else {
  skip('direct Neon row-count check', 'set NEON_DIRECT_URL');
}

/* ------------------------------------------------------------------ */
/* 5. Mutating flows — every write path the UI can trigger              */
/* ------------------------------------------------------------------ */

console.log('\n[5] Mutating flows (LIVE_WRITE=1)');

const created = {
  workspaces: [] as string[],
  users: [] as string[],
  invites: [] as string[],
  eventIds: [] as string[],
};

if (!WRITE) {
  for (const name of [
    'project create/update/delete + audit log',
    'invite create/list/accept/revoke + email provider',
    'Resend email delivery confirmation',
    'role enforcement (member → admin → removal)',
    'workspace settings update/revert',
    'signed Stripe webhook events + idempotency',
  ]) {
    skip(name, 'set LIVE_WRITE=1 (and NEON_DIRECT_URL for cleanup)');
  }
} else {
  try {
    let tempWorkspaceId: string | undefined;

    await check('create workspace, switch to it, switch back', async () => {
      const createdRes = await owner.request('/api/workspaces', {
        method: 'POST',
        body: { name: `Live Smoke ${RUN}` },
      });
      expectStatus(createdRes, 201, 'create workspace');
      tempWorkspaceId = createdRes.json.workspace.id;
      created.workspaces.push(tempWorkspaceId);

      const switched = await owner.request('/api/auth/switch-workspace', {
        method: 'POST',
        body: { workspaceId: tempWorkspaceId },
      });
      expectStatus(switched, 200, 'switch workspace');
      assert.equal(switched.json.workspace.id, tempWorkspaceId);
      const current = await owner.request('/api/workspaces/current');
      assert.equal(current.json.id, tempWorkspaceId);

      const back = await owner.request('/api/auth/switch-workspace', {
        method: 'POST',
        body: { workspaceId },
      });
      expectStatus(back, 200, 'switch back');
      return tempWorkspaceId;
    });

    let projectId: string | undefined;
    const projectName = `Live Smoke Project ${RUN}`;

    await check('project create → list → update → delete → audit log', async () => {
      const createdRes = await owner.request('/api/projects', {
        method: 'POST',
        body: {
          name: projectName,
          status: 'planning',
          budgetCents: 123456,
          dueDate: '2027-01-31',
          ownerName: 'Smoke Tester',
        },
      });
      expectStatus(createdRes, 201, 'create project');
      projectId = createdRes.json.project.id;

      const found = await owner.request(`/api/projects?q=${encodeURIComponent(projectName)}`);
      assert.equal(found.json.total, 1, 'new project must be searchable');

      const patched = await owner.request(`/api/projects/${projectId}`, {
        method: 'PATCH',
        body: { status: 'active', budgetCents: 654321 },
      });
      expectStatus(patched, 200, 'update project');
      assert.equal(patched.json.project.status, 'active');
      assert.equal(patched.json.project.budgetCents, 654321);

      const overview = await owner.request('/api/overview?period=last-7');
      assert.ok(
        overview.json.activity?.some((a: { action: string }) => a.action === 'project.created'),
        'audit log must record project.created',
      );

      const deleted = await owner.request(`/api/projects/${projectId}`, { method: 'DELETE' });
      expectStatus(deleted, 204, 'delete project');
      const gone = await owner.request(`/api/projects?q=${encodeURIComponent(projectName)}`);
      assert.equal(gone.json.total, 0, 'deleted project must be gone');
      projectId = undefined;
    });

    await check('workspace settings update and revert', async () => {
      const patch = await owner.request('/api/workspaces/current', {
        method: 'PATCH',
        body: { settings: { locale: 'id', weeklyDigest: false } },
      });
      expectStatus(patch, 200, 'settings update');
      assert.equal(patch.json.settings.locale, 'id');
      assert.equal(patch.json.settings.weeklyDigest, false);

      const revert = await owner.request('/api/workspaces/current', {
        method: 'PATCH',
        body: { settings: { locale: 'en', weeklyDigest: true } },
      });
      expectStatus(revert, 200, 'settings revert');
      assert.equal(revert.json.settings.locale, 'en');
    });

    // Resend's onboarding sender may only mail the account owner, so when a
    // real inbox is provided use it for the delivered-invite check. The other
    // flows keep unique addresses so they never collide with an existing member.
    const inviteEmail = RESEND_TEST_EMAIL ?? `smoke-${RUN}@example.com`;
    const revokeEmail = `revoke-${RUN}@example.com`;
    const rbacEmail = `rbac-${RUN}@example.com`;
    created.invites.push(inviteEmail, revokeEmail, rbacEmail);
    let inviteToken: string | undefined;
    let invitedUserId: string | undefined;

    await check('invite create → list → accept → revoke, with email provider result', async () => {
      const invited = await owner.request('/api/invites', {
        method: 'POST',
        body: { email: inviteEmail, role: 'member' },
      });
      expectStatus(invited, 201, 'create invite');
      assert.ok(invited.json.invite?.id);
      assert.ok(['resend', 'console', 'memory'].includes(invited.json.emailProvider));
      if (RESEND_TEST_EMAIL) {
        assert.equal(invited.json.emailProvider, 'resend', 'Resend must be active in prod');
        assert.equal(invited.json.emailSent, true, 'Resend must accept the invitation email');
      } else {
        assert.equal(invited.json.emailSent, invited.json.emailProvider !== 'resend');
      }

      const acceptUrl = new URL(invited.json.acceptUrl);
      inviteToken = acceptUrl.searchParams.get('token') ?? undefined;
      assert.ok(inviteToken, 'accept URL must contain a token');
      assert.equal(acceptUrl.pathname, '/invite');

      const list = await owner.request('/api/invites');
      assert.ok(list.json.some((i: { email: string }) => i.email === inviteEmail));

      const member = client();
      const accepted = await member.request('/api/invites/accept', {
        method: 'POST',
        body: { token: inviteToken },
      });
      expectStatus(accepted, 200, 'accept invite');
      invitedUserId = accepted.json.user?.id;
      assert.ok(invitedUserId, 'accept must sign the invited user in');

      const me = await member.request('/api/auth/me');
      assert.equal(me.json.user?.email, inviteEmail);
      assert.equal(me.json.role, 'member');
      created.users.push(invitedUserId);

      // The original token is burned: replay must fail.
      const replay = await client().request('/api/invites/accept', {
        method: 'POST',
        body: { token: inviteToken },
      });
      expectStatus(replay, 409, 'replayed invite');

      // A fresh invite can be revoked before it is accepted.
      const second = await owner.request('/api/invites', {
        method: 'POST',
        body: { email: revokeEmail, role: 'member' },
      });
      expectStatus(second, 201, 'second invite');
      const revoked = await owner.request(`/api/invites?email=${encodeURIComponent(revokeEmail)}`, {
        method: 'DELETE',
      });
      expectStatus(revoked, 204, 'revoke invite');
      const token2 = new URL(second.json.acceptUrl).searchParams.get('token');
      const dead = await client().request('/api/invites/accept', {
        method: 'POST',
        body: { token: token2 },
      });
      expectStatus(dead, 404, 'revoked invite token');

      return `emailProvider=${invited.json.emailProvider}`;
    });

    if (RESEND_API_KEY && RESEND_TEST_EMAIL) {
      await check('Resend API confirms the invitation email was accepted', async () => {
        const res = await fetch('https://api.resend.com/emails?limit=20', {
          headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
        });
        assert.equal(res.status, 200, `Resend list: HTTP ${res.status}`);
        const data = (await res.json()) as {
          data: Array<{ id: string; to: string[]; subject: string }>;
        };
        const match = data.data.find(
          (mail) =>
            mail.to?.includes(RESEND_TEST_EMAIL) && (mail.subject ?? '').startsWith('Join '),
        );
        assert.ok(
          match,
          `no invitation email to ${RESEND_TEST_EMAIL} in the last 20 Resend emails`,
        );

        const detail = await fetch(`https://api.resend.com/emails/${match.id}`, {
          headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
        });
        assert.equal(detail.status, 200, `Resend detail: HTTP ${detail.status}`);
        const mail = (await detail.json()) as {
          id: string;
          to: string[];
          last_event?: string;
        };
        assert.ok(mail.to?.includes(RESEND_TEST_EMAIL), 'email recipient must match');
        assert.ok(
          ['delivered', 'sent'].includes(mail.last_event ?? ''),
          `Resend delivery event was ${mail.last_event ?? 'missing'}`,
        );
        return `${mail.id} · last_event=${mail.last_event}`;
      });
    } else {
      skip('Resend API delivery confirmation', 'set RESEND_API_KEY and LIVE_RESEND_TEST_EMAIL');
    }

    await check(
      'RBAC: member cannot delete a project; admin can; owner removes member',
      async () => {
        assert.ok(invitedUserId, 'need the invited member from the previous check');
        // Invited users get a random password, so use the magic-link session
        // from a fresh invite instead of logging in.
        const member = client();
        const fresh = await owner.request('/api/invites', {
          method: 'POST',
          body: { email: rbacEmail, role: 'member' },
        });
        expectStatus(fresh, 201, 'RBAC invite');
        const token = new URL(fresh.json.acceptUrl).searchParams.get('token');
        const accepted = await member.request('/api/invites/accept', {
          method: 'POST',
          body: { token },
        });
        expectStatus(accepted, 200, 'RBAC accept');
        const rbacUser: string = accepted.json.user.id;
        created.users.push(rbacUser);

        const target = await owner.request('/api/projects', {
          method: 'POST',
          body: {
            name: `RBAC Target ${RUN}`,
            status: 'planning',
            budgetCents: 100,
            dueDate: null,
            ownerName: 'Smoke Tester',
          },
        });
        expectStatus(target, 201, 'RBAC target project');
        const targetId: string = target.json.project.id;

        const denied = await member.request(`/api/projects/${targetId}`, { method: 'DELETE' });
        expectStatus(denied, 403, 'member delete must be forbidden');

        const promoted = await owner.request(`/api/members/${rbacUser}`, {
          method: 'PATCH',
          body: { role: 'admin' },
        });
        expectStatus(promoted, 200, 'promote to admin');
        assert.equal(promoted.json.role, 'admin');

        // The member's existing session picks up the new role on the next request.
        const adminDelete = await member.request(`/api/projects/${targetId}`, { method: 'DELETE' });
        expectStatus(adminDelete, 204, 'admin delete');

        const removed = await owner.request(`/api/members/${rbacUser}`, { method: 'DELETE' });
        expectStatus(removed, 204, 'remove member');
        const after = await member.request('/api/auth/me');
        assert.equal(after.json.user, null, 'removed member session must be revoked');
        return '403 → admin 204 → member removed';
      },
    );

    if (WEBHOOK_SECRET && tempWorkspaceId) {
      await check('signed Stripe webhooks apply once and keep the plan entitlement', async () => {
        const eventIds = [
          `evt_smoke_${RUN}_checkout`,
          `evt_smoke_${RUN}_subscription`,
          `evt_smoke_${RUN}_invoice`,
        ];
        created.eventIds.push(...eventIds);

        async function deliver(event: unknown, id: string) {
          const payload = JSON.stringify(event);
          // Stripe signs the raw bytes, so send the string directly instead of
          // going through the JSON-serialising request helper.
          const raw = await fetch(`${BASE}/api/billing/webhook`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'stripe-signature': stripeSignature(payload, WEBHOOK_SECRET as string),
            },
            body: payload,
          });
          const text = await raw.text();
          assert.equal(raw.status, 200, `webhook ${id}: ${text}`);
          const json = JSON.parse(text);
          assert.equal(json.received, true);
          return json as { duplicate: boolean };
        }

        const first = await deliver(
          {
            id: eventIds[0],
            object: 'event',
            type: 'checkout.session.completed',
            data: {
              object: {
                id: `cs_smoke_${RUN}`,
                object: 'checkout.session',
                metadata: { workspaceId: tempWorkspaceId, plan: 'pro' },
                client_reference_id: tempWorkspaceId,
                customer: `cus_smoke_${RUN}`,
                subscription: `sub_smoke_${RUN}`,
              },
            },
          },
          eventIds[0],
        );
        assert.equal(first.duplicate, false);

        const duplicate = await deliver(
          {
            id: eventIds[0],
            object: 'event',
            type: 'checkout.session.completed',
            data: { object: { id: `cs_smoke_${RUN}` } },
          },
          eventIds[0],
        );
        assert.equal(duplicate.duplicate, true, 'redelivery must be idempotent');

        await deliver(
          {
            id: eventIds[1],
            object: 'event',
            type: 'customer.subscription.updated',
            data: {
              object: {
                id: `sub_smoke_${RUN}`,
                object: 'subscription',
                status: 'past_due',
                cancel_at_period_end: false,
                metadata: { workspaceId: tempWorkspaceId, plan: 'pro' },
                items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 86400 }] },
              },
            },
          },
          eventIds[1],
        );

        await deliver(
          {
            id: eventIds[2],
            object: 'event',
            type: 'invoice.paid',
            data: {
              object: {
                id: `in_smoke_${RUN}`,
                object: 'invoice',
                number: `SMOKE-${RUN}`,
                metadata: { workspaceId: tempWorkspaceId },
              },
            },
          },
          eventIds[2],
        );

        // Verify the resulting local state through the app itself.
        await owner.request('/api/auth/switch-workspace', {
          method: 'POST',
          body: { workspaceId: tempWorkspaceId },
        });
        const billing = await owner.request('/api/billing');
        expectStatus(billing, 200, 'billing after webhook');
        assert.equal(billing.json.subscription.status, 'past_due');
        assert.equal(billing.json.plan, 'pro', 'past_due must not downgrade entitlement');
        const overview = await owner.request('/api/overview?period=last-7');
        assert.ok(
          overview.json.activity?.some(
            (a: { action: string }) => a.action === 'billing.invoice_paid',
          ),
          'invoice.paid audit entry must be visible',
        );
        await owner.request('/api/auth/switch-workspace', {
          method: 'POST',
          body: { workspaceId },
        });
        return 'checkout activated, redelivery deduped, past_due kept pro';
      });
    } else {
      skip('signed Stripe webhook events', 'set STRIPE_WEBHOOK_SECRET and LIVE_WRITE=1');
    }
  } finally {
    // Restore the operator's active workspace first, then remove every row the
    // suite created. Direct SQL is used because a webhook may attach a fake
    // subscription id that intentionally blocks API workspace deletion.
    await owner.request('/api/auth/switch-workspace', {
      method: 'POST',
      body: { workspaceId },
    });

    if (DIRECT_URL) {
      await check('cleanup: remove all rows created by this run', async () => {
        const sql = postgres(DIRECT_URL, { prepare: false, max: 1, connect_timeout: 10 });
        try {
          for (const id of created.eventIds) {
            await sql`delete from stripe_events where id = ${id}`;
          }
          for (const email of created.invites) {
            await sql`delete from invites where email = ${email}`;
          }
          for (const id of created.users) {
            await sql`delete from users where id = ${id}`;
          }
          for (const id of created.workspaces) {
            await sql`delete from workspaces where id = ${id}`;
          }
        } finally {
          await sql.end();
        }
        return `${created.eventIds.length} events, ${created.invites.length} invites, ${created.users.length} users, ${created.workspaces.length} workspaces`;
      });
    } else if (
      created.eventIds.length ||
      created.invites.length ||
      created.users.length ||
      created.workspaces.length
    ) {
      skip('cleanup of created rows', 'set NEON_DIRECT_URL — production data was left behind');
    }
    await direct?.end();
  }
}

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

const passed = results.filter((r) => r.status === 'PASS').length;
const failed = results.filter((r) => r.status === 'FAIL').length;
const skipped = results.filter((r) => r.status === 'SKIP').length;
console.log(`\nSummary: ${passed} passed, ${failed} failed, ${skipped} skipped`);
if (failed > 0) {
  console.log('\nFailures:');
  for (const r of results.filter((x) => x.status === 'FAIL')) {
    console.log(`  - ${r.name}: ${r.detail}`);
  }
}
process.exit(failed > 0 ? 1 : 0);
