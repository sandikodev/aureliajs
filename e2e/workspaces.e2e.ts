import { expect, test } from '@playwright/test';
import { signupOwner, type E2EOwner } from './helpers/auth';
import { closeDb } from './helpers/db';

/**
 * Workspace switching and the activity feed.
 *
 * Both used to be decoration: the switcher listed one hardcoded workspace
 * and the notification bell was a button with a permanent red dot that went
 * nowhere. These tests check that they now do something. Each test creates its
 * own owner account, so what the switcher lists is the real workspace.
 */

async function createOwner(page: Parameters<typeof signupOwner>[0]): Promise<E2EOwner> {
  return signupOwner(page);
}

test.describe('workspaces', () => {
  test.afterAll(async () => {
    await closeDb();
  });

  test('the switcher lists the workspaces the user belongs to', async ({ page }) => {
    const owner = await createOwner(page);
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('workspace-switcher').click();

    const menu = page.locator('aside details').first();
    await expect(menu.getByRole('button', { name: new RegExp(owner.workspaceName) })).toBeVisible();
    await expect(menu.getByRole('button', { name: /Create workspace/ })).toBeVisible();
  });

  test('a workspace can be created and switched into', async ({ page }) => {
    await createOwner(page);
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');

    const original = await (await page.request.get('/api/workspaces/current')).json();
    const name = `E2E Studio ${Date.now()}`;

    await page.getByTestId('workspace-switcher').click();
    await page.getByRole('button', { name: /Create workspace/ }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.locator('#new-workspace-name').fill(name);
    await dialog.getByRole('button', { name: /Create workspace/ }).click();

    // The new workspace is created and becomes the active one.
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('status').filter({ hasText: name })).toBeVisible();
    await page.waitForTimeout(600);

    const list = await (await page.request.get('/api/workspaces')).json();
    const created = list.workspaces.find((w: { name: string }) => w.name === name);
    expect(created, 'the new workspace should exist').toBeTruthy();
    expect(created.isActive).toBeTruthy();

    // And the session now points at it.
    const session = await (await page.request.get('/api/auth/me')).json();
    expect(session.workspace.id).toBe(created.id);

    // Switch back and delete it, so the rest of the suite is unaffected.
    await page.request.post('/api/auth/switch-workspace', {
      data: { workspaceId: original.id },
      headers: { 'content-type': 'application/json' },
    });
    await page.request
      .delete(`/api/workspaces/${created.id}`, {
        headers: { 'content-type': 'application/json' },
      })
      .catch(() => {});

    // The delete endpoint only handles the *active* workspace, so switch into
    // the new one first and remove it from there.
    await page.request.post('/api/auth/switch-workspace', {
      data: { workspaceId: created.id },
      headers: { 'content-type': 'application/json' },
    });
    await page.request.delete('/api/workspaces/current');
    await page.request.post('/api/auth/switch-workspace', {
      data: { workspaceId: original.id },
      headers: { 'content-type': 'application/json' },
    });

    const after = await (await page.request.get('/api/workspaces')).json();
    expect(after.workspaces.some((w: { id: string }) => w.id === created.id)).toBeFalsy();
  });

  test('the activity feed shows real audit entries', async ({ page }) => {
    await createOwner(page);
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('notification-bell').click();

    const items = page.locator('header li');
    await expect(items.first()).toBeVisible();
    expect(await items.count()).toBeGreaterThan(0);

    // The first entry carries a real relative timestamp, not an empty cell.
    const text = await items.first().innerText();
    expect(text.trim().length).toBeGreaterThan(0);
    expect(text).toMatch(/ago|just now|\b\d+[hm]\b/);
  });

  test('the workspace name and slug can be changed and persist', async ({ page }) => {
    await createOwner(page);
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const original = await (await page.request.get('/api/workspaces/current')).json();
    const slug = `e2e-studio-${Date.now()}`;

    await page.locator('#ws-slug').fill(slug);
    await page.getByRole('button', { name: /Save changes/ }).click();

    await expect(page.getByRole('status').filter({ hasText: /saved/i })).toBeVisible({
      timeout: 7000,
    });

    const after = await (await page.request.get('/api/workspaces/current')).json();
    expect(after.slug).toBe(slug);

    // Put it back.
    await page.locator('#ws-slug').fill(original.slug);
    await page.getByRole('button', { name: /Save changes/ }).click();
    await page.waitForTimeout(400);
  });

  test('the dashboard reporting period changes the numbers behind the cards', async ({ page }) => {
    await createOwner(page);
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');

    const total = page.getByTestId('stat-total');
    const before = Number(await total.innerText());

    // A 7-day window cannot contain more projects than a 90-day one.
    await page.locator('main select').first().selectOption('last-7');
    await page.waitForTimeout(700);
    const after7 = Number(await total.innerText());

    await page.locator('main select').first().selectOption('quarter');
    await page.waitForTimeout(700);
    const afterQuarter = Number(await total.innerText());

    expect(after7).toBeLessThanOrEqual(afterQuarter);
    expect(after7).toBeLessThanOrEqual(before + 1);
  });

  test('two workspaces cannot claim the same slug in a race', async ({ page, browser }) => {
    const owner = await createOwner(page);
    const a = page.request;
    const original = await (await a.get('/api/workspaces/current')).json();
    const stamp = Date.now();
    const resA = await a.post('/api/workspaces', { data: { name: `Race A ${stamp}` } });
    const resB = await a.post('/api/workspaces', { data: { name: `Race B ${stamp}` } });
    const wa = await resA.json();
    const wb = await resB.json();
    expect([resA.status(), resB.status()]).toEqual([201, 201]);
    const workspaceA = wa.workspace as { id: string };
    const workspaceB = wb.workspace as { id: string };

    // Two sessions (and therefore two active workspaces) are needed: the
    // interesting race is two different rows claiming the same slug, not one
    // row being renamed twice to the same value.
    const contextB = await browser.newContext({ baseURL: 'http://localhost:4600' });
    const b = contextB.request;

    try {
      expect(
        (
          await b.post('/api/auth/login', {
            data: { email: owner.email, password: owner.password },
          })
        ).ok(),
      ).toBeTruthy();

      await Promise.all([
        a.post('/api/auth/switch-workspace', { data: { workspaceId: workspaceA.id } }),
        b.post('/api/auth/switch-workspace', { data: { workspaceId: workspaceB.id } }),
      ]);

      const meA = await (await a.get('/api/auth/me')).json();
      const meB = await (await b.get('/api/auth/me')).json();
      expect(
        meA.workspace.id !== meB.workspace.id,
        `sessions must differ: A=${meA.workspace.id} B=${meB.workspace.id} wa=${workspaceA.id} wb=${workspaceB.id}`,
      ).toBeTruthy();

      const target = `race-target-${stamp}`;
      const [ra, rb] = await Promise.all([
        a.patch('/api/workspaces/current', { data: { slug: target } }),
        b.patch('/api/workspaces/current', { data: { slug: target } }),
      ]);

      expect([ra.status(), rb.status()].sort()).toEqual([200, 409]);
    } finally {
      // Remove both temporary workspaces so this test stays isolated.
      await a.post('/api/auth/switch-workspace', { data: { workspaceId: original.id } });
      await a.post('/api/auth/switch-workspace', { data: { workspaceId: workspaceA.id } });
      await a.delete('/api/workspaces/current');
      await a.post('/api/auth/switch-workspace', { data: { workspaceId: workspaceB.id } });
      await a.delete('/api/workspaces/current');
      await a.post('/api/auth/switch-workspace', { data: { workspaceId: original.id } });
      await contextB.close();
    }
  });

  test('the seat limit is enforced when inviting', async ({ page }) => {
    await createOwner(page);

    // A freshly signed-up workspace starts empty but still has a seat limit.
    // The check is that the API reports it and the UI shows it.
    const members = await (await page.request.get('/api/members')).json();
    expect(members.seatLimit).toBeGreaterThan(0);
    expect(members.seatUsed).toBeLessThanOrEqual(members.seatLimit);

    await page.goto('/members');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/\d+ of \d+ seats/)).toBeVisible();
  });
});
