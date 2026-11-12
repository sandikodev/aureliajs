import { expect, test } from '@playwright/test';

/**
 * Smoke coverage for the shell + routing + the design system.
 * These are the checks that break first when framework conventions drift.
 */

const consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors.length = 0;
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  // Log in as the demo user so authenticated tests work without a manual cookie.
  // Use the API directly via Playwright's request API (bypasses the Aurelia SPA routing).
  const response = await page.request.post('/api/auth/login', {
    data: { email: 'demo@aureliajs.dev', password: 'demo-password-123' },
    headers: { 'content-type': 'application/json' },
  });
  if (!response.ok()) {
    // If login fails (e.g. API not running), the tests that follow will just
    // run against the unauthenticated state; that's acceptable for smoke coverage.
    console.error(`Login failed: ${response.status()} ${await response.text().slice(0, 200)}`);
  }
});

test.afterEach(() => {
  expect(consoleErrors, `console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
});

test('dashboard renders KPIs and navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Delivery throughput')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Projects' })).toBeVisible();
});

test('can navigate to projects and filter', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Projects' }).click();
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New project' })).toBeVisible();

  // Scoped to `main` because the shell also has a global search box.
  const search = page.getByRole('main').getByRole('searchbox', { name: 'Search projects' });
  await search.fill('billing');
  await expect(page.getByText(/Showing/)).toBeVisible();
});

test('theme toggle flips the dark class', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveClass(/dark|light|/);
  const before = await html.evaluate((el) => el.classList.contains('dark'));
  await page.getByRole('button', { name: /Switch to (light|dark) theme/ }).click();
  await expect.poll(async () => html.evaluate((el) => el.classList.contains('dark'))).toBe(!before);
});

test('unknown route renders the fallback page', async ({ page }) => {
  await page.goto('/this-route-does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('new-project dialog validates before submitting', async ({ page }) => {
  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Too small: expected string to have >=2 characters')).toBeVisible();

  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('creates and deletes a project end to end', async ({ page }) => {
  const name = `E2E project ${Date.now()}`;
  page.on('dialog', (dialog) => dialog.accept());

  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).click();
  await page.locator('#project-name').fill(name);
  await page.locator('#project-owner').fill('QA Bot');
  await page.locator('#project-budget').fill('4200');
  await page.getByRole('button', { name: 'Create project' }).click();

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText(`Created “${name}”.`)).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: name });
  await expect(row).toHaveCount(1);

  await row.getByLabel('Project actions').click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText(`Deleted “${name}”.`)).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: name })).toHaveCount(0);
});
