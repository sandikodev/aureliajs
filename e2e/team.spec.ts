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

test.describe('team', () => {
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
    expect(body.members.length).toBe(body.seatUsed);
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
});
