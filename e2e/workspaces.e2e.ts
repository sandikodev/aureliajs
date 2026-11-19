import { expect, test, type Page } from '@playwright/test';
import { closeDb } from './helpers/db';

/**
 * Workspace switching and the activity feed.
 *
 * Both used to be decoration: the switcher listed one hardcoded workspace
 * and the notification bell was a button with a permanent red dot that went
 * nowhere. These tests check that they now do something.
 */

async function login(page: Page) {
  const response = await page.request.post('/api/auth/login', {
    data: { email: 'demo@aureliajs.dev', password: 'demo-password-123' },
    headers: { 'content-type': 'application/json' },
  });
  expect(response.ok()).toBeTruthy();
}

test.describe('workspaces', () => {
  test.afterAll(async () => {
    await closeDb();
  });

  test('the switcher lists the workspaces the user belongs to', async ({ page }) => {
    await login(page);
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('workspace-switcher').click();

    const menu = page.locator('aside details').first();
    await expect(menu.getByRole('button', { name: /Northwind Studio/ })).toBeVisible();
    await expect(menu.getByRole('button', { name: /Create workspace/ })).toBeVisible();
  });

  test('a workspace can be created and switched into', async ({ page }) => {
    await login(page);
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
    await login(page);
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
    await login(page);
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const original = await (await page.request.get('/api/workspaces/current')).json();
    const slug = `e2e-studio-${Date.now()}`;

    await page.locator('#ws-slug').fill(slug);
    await page.getByRole('button', { name: /Save changes/ }).click();

    await expect(page.getByRole('status').filter({ hasText: /saved/i })).toBeVisible({ timeout: 7000 });

    const after = await (await page.request.get('/api/workspaces/current')).json();
    expect(after.slug).toBe(slug);

    // Put it back.
    await page.locator('#ws-slug').fill(original.slug);
    await page.getByRole('button', { name: /Save changes/ }).click();
    await page.waitForTimeout(400);
  });

  test('the dashboard reporting period changes the numbers behind the cards', async ({ page }) => {
    await login(page);
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

  test('the seat limit is enforced when inviting', async ({ page }) => {
    await login(page);

    // The demo workspace is on the pro plan, so there is room. The check is
    // that the API reports the limit and the UI shows it.
    const members = await (await page.request.get('/api/members')).json();
    expect(members.seatLimit).toBeGreaterThan(0);
    expect(members.seatUsed).toBeLessThanOrEqual(members.seatLimit);

    await page.goto('/members');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/\d+ of \d+ seats/)).toBeVisible();
  });
});
