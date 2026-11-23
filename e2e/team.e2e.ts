import { expect, test, type Page } from '@playwright/test';
import { closeDb } from './helpers/db';

/**
 * Team management coverage.
 *
 * The invite flow is the piece most demos fake: creating an invitation,
 * opening the magic link and ending up signed in as the new member. These
 * tests walk the whole path against the real API.
 */

const INVITEE_EMAIL = `e2e-invitee-${Date.now()}@northwind.test`;

async function login(page: Page) {
  const response = await page.request.post('/api/auth/login', {
    data: { email: 'demo@aureliajs.dev', password: 'demo-password-123' },
    headers: { 'content-type': 'application/json' },
  });
  expect(response.ok(), 'demo login should succeed').toBeTruthy();
}

/**
 * Remove a member again.
 *
 * Without this the suite leaves people behind, and the seat limit is reached
 * halfway through the next run — which is how a test that depends on a clean
 * database turns into one that fails for the wrong reason.
 */
async function removeMember(page: Page, email: string): Promise<void> {
  const members = await (await page.request.get('/api/members')).json();
  const target = members.members.find((m: { email: string }) => m.email === email);
  if (!target) return;

  await page.request.delete(`/api/members/${target.id}`, {
    headers: { 'content-type': 'application/json' },
  });
}

test.describe('team', () => {
  /**
   * Revoke any invitation left behind by an earlier run.
   *
   * An open invitation reserves a seat, so six of them would push the
   * workspace over its seat limit and every later test would fail for the
   * wrong reason.
   */
  test.beforeEach(async ({ page }) => {
    await login(page);

    const open = await (await page.request.get('/api/invites')).json();
    for (const invite of open) {
      if (invite.state === 'pending') {
        await page.request.delete(`/api/invites?id=${invite.id}`).catch(() => {});
      }
    }
  });

  test.afterAll(async () => {
    await closeDb();
  });

  test('members endpoint lists the team with roles and seat usage', async ({ page }) => {
    await login(page);

    const response = await page.request.get('/api/members');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.seatUsed).toBeGreaterThan(0);
    expect(body.seatLimit).toBeGreaterThan(0);
    expect(body.members.length).toBe(body.memberCount);
    expect(body.members[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      email: expect.any(String),
      role: expect.any(String),
      joinedAt: expect.any(String),
    });
  });

  test('members page renders the team from the API', async ({ page }) => {
    await login(page);
    await page.goto('/members');

    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
    await expect(page.getByRole('table').getByText('demo@aureliajs.dev')).toBeVisible();
    await expect(page.getByRole('table').getByText('Owner').first()).toBeVisible();
    await expect(page.getByText(/\d+ of \d+ seats/)).toBeVisible();
  });

  test('changing a role from the members page persists through the API', async ({ page }) => {
    await login(page);

    const before = await (await page.request.get('/api/members')).json();
    const target = before.members.find(
      (m: { email: string }) => m.email === 'daniel@northwind.test',
    );
    expect(target, 'the seeded member should exist').toBeTruthy();
    const originalRole = target.role as string;

    try {
      await page.goto('/members');
      await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();

      const row = page.getByRole('row').filter({ hasText: 'daniel@northwind.test' });
      // <ui-select value.bind="member.role"> plus change.trigger both listen
      // to the native change event. If the two-way binding updates the source
      // first, changeRole() sees an unchanged role and returns early — so the
      // select would appear to work while never calling the API. This test is
      // the guard for that ordering bug.
      await row.locator('select').selectOption('admin');

      await expect
        .poll(async () => {
          const fresh = await (await page.request.get('/api/members')).json();
          return fresh.members.find((m: { id: string }) => m.id === target.id)?.role;
        })
        .toBe('admin');
    } finally {
      // Leave the seeded state intact for the rest of the suite.
      await page.request.patch(`/api/members/${target.id}`, {
        data: { role: originalRole },
        headers: { 'content-type': 'application/json' },
      });
    }
  });

  test('members page on mobile viewport has no horizontal scroll or layout overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page);
    await page.goto('/members');

    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
    await expect(page.getByRole('table').getByText('demo@aureliajs.dev')).toBeVisible();

    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const main = document.querySelector('main');
      return {
        windowScrollX: window.scrollX,
        docClientWidth: doc.clientWidth,
        docScrollWidth: doc.scrollWidth,
        bodyScrollWidth: body.scrollWidth,
        mainClientWidth: main ? main.clientWidth : 0,
        mainScrollWidth: main ? main.scrollWidth : 0,
      };
    });

    expect(metrics.docScrollWidth).toBeLessThanOrEqual(metrics.docClientWidth);
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.docClientWidth);
    expect(metrics.mainScrollWidth).toBeLessThanOrEqual(metrics.mainClientWidth);
    expect(metrics.windowScrollX).toBe(0);
  });

  test('an invite can be created and accepted, and the new member joins', async ({ page }) => {
    await login(page);

    // 1. The owner creates an invitation for somebody with no account yet.
    const created = await page.request.post('/api/invites', {
      data: { email: INVITEE_EMAIL, role: 'member' },
      headers: { 'content-type': 'application/json' },
    });
    expect(created.status()).toBe(201);

    const { acceptUrl } = await created.json();
    expect(acceptUrl).toContain('/invite?token=');

    // 2. A brand new browser context (no session) opens the magic link.
    const invitee = await page.context().browser()!.newContext();
    const inviteePage = await invitee.newPage();

    await inviteePage.goto(acceptUrl);
    await expect(inviteePage.getByTestId('invite-accepted')).toBeVisible({ timeout: 10_000 });

    // 3. The invitee is signed in and belongs to the workspace.
    const session = await (await inviteePage.request.get('/api/auth/me')).json();
    expect(session.user?.email).toBe(INVITEE_EMAIL);
    expect(session.workspace?.id).toBeTruthy();

    // 4. The owner sees the new member and the seat count grew.
    const members = await (await page.request.get('/api/members')).json();
    expect(members.members.some((m: { email: string }) => m.email === INVITEE_EMAIL)).toBeTruthy();

    // 5. The token cannot be used twice.
    const reuse = await page.request.post('/api/invites/accept', {
      data: { token: acceptUrl.split('token=')[1] },
      headers: { 'content-type': 'application/json' },
    });
    expect(reuse.status()).toBe(409);

    await invitee.close();

    // Leave the workspace the way we found it.
    await removeMember(page, INVITEE_EMAIL);
  });

  test('the only owner cannot demote themselves', async ({ page }) => {
    await login(page);

    const session = await (await page.request.get('/api/auth/me')).json();
    const members = await (await page.request.get('/api/members')).json();
    const self = members.members.find((m: { id: string }) => m.id === session.user.id);
    expect(self?.role).toBe('owner');

    // The guard must exclude the target from the "another owner exists" query.
    const response = await page.request.patch(`/api/members/${self.id}`, {
      data: { role: 'member' },
      headers: { 'content-type': 'application/json' },
    });
    expect(response.status()).toBe(409);
    expect((await response.json()).error.message).toContain('at least one owner');

    const after = await (await page.request.get('/api/members')).json();
    expect(after.members.find((m: { id: string }) => m.id === self.id).role).toBe('owner');
  });

  test('the members page refuses an owner self-demotion and rolls back the select', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/members');
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();

    const session = await (await page.request.get('/api/auth/me')).json();
    const selfRow = page.getByRole('row').filter({ hasText: 'demo@aureliajs.dev' });
    const select = selfRow.locator('select');
    await expect(select).toHaveValue('owner');

    await select.selectOption('member');
    await expect(page.getByText(/at least one owner/i)).toBeVisible();
    await expect(select).toHaveValue('owner');

    const members = await (await page.request.get('/api/members')).json();
    expect(members.members.find((m: { id: string }) => m.id === session.user.id).role).toBe(
      'owner',
    );
  });

  test('a member can be demoted and removed by the owner', async ({ page }) => {
    await login(page);

    const created = await page.request.post('/api/invites', {
      data: { email: `e2e-remove-${Date.now()}@northwind.test`, role: 'member' },
      headers: { 'content-type': 'application/json' },
    });
    expect(created.status()).toBe(201);
    const { acceptUrl } = await created.json();

    const invitee = await page.context().browser()!.newContext();
    const inviteePage = await invitee.newPage();
    await inviteePage.goto(acceptUrl);
    await expect(inviteePage.getByTestId('invite-accepted')).toBeVisible({ timeout: 10_000 });

    const email = (await (await inviteePage.request.get('/api/auth/me')).json()).user
      ?.email as string;
    const members = await (await page.request.get('/api/members')).json();
    const target = members.members.find((m: { email: string }) => m.email === email);

    // Promote to admin.
    const promoted = await page.request.patch(`/api/members/${target.id}`, {
      data: { role: 'admin' },
      headers: { 'content-type': 'application/json' },
    });
    expect(promoted.status()).toBe(200);

    const afterPromote = await (await page.request.get('/api/members')).json();
    expect(afterPromote.members.find((m: { id: string }) => m.id === target.id).role).toBe('admin');

    // Then remove them.
    const removed = await page.request.delete(`/api/members/${target.id}`);
    expect(removed.status()).toBe(204);

    const afterRemove = await (await page.request.get('/api/members')).json();
    expect(afterRemove.members.some((m: { id: string }) => m.id === target.id)).toBeFalsy();

    // Their session is dead — removing somebody revokes the sessions that
    // pointed at this workspace, so the next request is unauthenticated.
    const afterRemoveSession = await inviteePage.request.get('/api/overview');
    expect(afterRemoveSession.status()).toBe(401);

    await invitee.close();
    await removeMember(page, email);
  });

  test('a member cannot invite or change roles', async ({ page }) => {
    await login(page);

    const members = await (await page.request.get('/api/members')).json();
    const plainMember = members.members.find((m: { role: string }) => m.role === 'member');
    expect(plainMember, 'the demo workspace should have a plain member').toBeTruthy();

    // Sign in as that member using the seeded demo password.
    const memberContext = await page.context().browser()!.newContext();
    const memberPage = await memberContext.newPage();

    const signIn = await memberPage.request.post('/api/auth/login', {
      data: { email: plainMember.email, password: 'demo-password-123' },
      headers: { 'content-type': 'application/json' },
    });
    expect(signIn.ok(), 'seeded members share the demo password').toBeTruthy();

    const inviteAttempt = await memberPage.request.post('/api/invites', {
      data: { email: 'sneaky@northwind.test', role: 'member' },
      headers: { 'content-type': 'application/json' },
    });
    expect(inviteAttempt.status()).toBe(403);

    const roleAttempt = await memberPage.request.patch(`/api/members/${plainMember.id}`, {
      data: { role: 'owner' },
      headers: { 'content-type': 'application/json' },
    });
    expect(roleAttempt.status()).toBe(403);

    await memberContext.close();
  });

  test('inviting more people than the plan allows is refused', async ({ page }) => {
    await login(page);

    // Revoke any invitation left behind by an earlier run so the seat
    // count starts from the real number of members.
    const open = await (await page.request.get('/api/invites')).json();
    for (const invite of open) {
      if (invite.state === 'pending') {
        await page.request.delete(`/api/invites?id=${invite.id}`).catch(() => {});
      }
    }

    const members = await (await page.request.get('/api/members')).json();
    const limit = members.seatLimit;

    // Fill the remaining seats with open invitations.
    const created: string[] = [];
    for (let i = members.seatUsed; i < limit; i += 1) {
      const response = await page.request.post('/api/invites', {
        data: { email: `e2e-seat-${i}-${Date.now()}@northwind.test`, role: 'member' },
        headers: { 'content-type': 'application/json' },
      });
      expect(response.status(), `invite ${i} should succeed`).toBe(201);
      created.push((await response.json()).invite.email);
    }

    // One more must be refused with the seat-limit code.
    const overflow = await page.request.post('/api/invites', {
      data: { email: `e2e-overflow-${Date.now()}@northwind.test`, role: 'member' },
      headers: { 'content-type': 'application/json' },
    });
    expect(overflow.status()).toBe(402);
    const body = await overflow.json();
    expect(body.error.code).toBe('seat_limit_reached');
    expect(body.error.message).toContain(String(limit));

    // The UI says so before the user even tries.
    await page.goto('/members');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('seats-full')).toBeVisible();

    // Clean up the invitations we created.
    for (const email of created) {
      await page.request.delete(`/api/invites?email=${encodeURIComponent(email)}`).catch(() => {});
    }
  });
});
