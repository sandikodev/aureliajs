import { expect, test } from '@playwright/test';

/**
 * Smoke coverage for the shell + routing + the design system.
 * These are the checks that break first when framework conventions drift.
 */

const consoleErrors: string[] = [];

async function loginAsDemo(page: any) {
  await page.goto('/login');
  await page.getByLabel('Work email').fill('demo@aureliajs.dev');
  await page.getByLabel('Password').fill('demo-password-123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/overview/);
  // Wait for the overview page to fully render
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible({ timeout: 10000 });
}

test.beforeEach(async ({ page }) => {
  consoleErrors.length = 0;
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await loginAsDemo(page);
});

test.afterEach(() => {
  expect(consoleErrors, `console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
});

test('dashboard renders KPIs and navigation', async ({ page }) => {
  // afterEach login already redirects to /overview
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
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
  await expect(page.getByText(`Created "${name}"`)).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: name });
  await expect(row).toHaveCount(1);

  await row
    .getByRole('group', { name: 'Project actions' })
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(page.getByText(`Deleted "${name}"`)).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: name })).toHaveCount(0);
});
