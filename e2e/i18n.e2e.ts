import { expect, test, type Page } from '@playwright/test';
import { closeDb } from './helpers/db';

/**
 * Internationalisation coverage.
 *
 * The point of these tests is not that the strings exist — it is that
 * switching the language actually re-renders the page. That is the part
 * that is easy to get wrong: Aurelia does not re-evaluate a binding that
 * *calls* a function returned by a getter, so the first version of this
 * changed the locale without changing a single word on screen.
 */

async function login(page: Page) {
  const response = await page.request.post('/api/auth/login', {
    data: { email: 'demo@aureliajs.dev', password: 'demo-password-123' },
    headers: { 'content-type': 'application/json' },
  });
  expect(response.ok()).toBeTruthy();
}

/**
 * Switch the language from the account menu, which works on any page.
 *
 * The menu is a `<details>`, so clicking the summary toggles it. If it is
 * already open the language button is visible and the summary must not be
 * clicked again — that would close it.
 */
async function setLocale(page: Page, locale: 'en' | 'id') {
  const button = page.getByRole('button', {
    name: locale === 'id' ? 'Bahasa Indonesia' : 'English',
  });

  if (!(await button.isVisible())) {
    await page.locator('[data-testid="language-menu"]').click();
  }

  await button.click();
  await page.waitForTimeout(400);
}

test.describe('i18n', () => {
  test.afterAll(async () => {
    await closeDb();
  });

  test('the locale is persisted and applied on the next page load', async ({ page }) => {
    await login(page);
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');

    await setLocale(page, 'id');

    // The document language follows the locale — screen readers use it.
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('id');

    // The choice survives a reload.
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('id');

    // Put it back so the other tests start from English.
    await setLocale(page, 'en');
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');
  });

  test('the page heading switches language without a reload', async ({ page }) => {
    await login(page);
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

    await setLocale(page, 'id');

    // The heading must change *in place* — not after a reload.
    await expect(page.getByRole('heading', { name: 'Proyek' })).toBeVisible();

    await setLocale(page, 'en');
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  });

  test('the navigation labels switch language too', async ({ page }) => {
    await login(page);
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('link', { name: 'Projects', exact: true })).toBeVisible();

    await setLocale(page, 'id');
    await expect(page.getByRole('link', { name: 'Proyek', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Anggota', exact: true })).toBeVisible();

    await setLocale(page, 'en');
    await expect(page.getByRole('link', { name: 'Projects', exact: true })).toBeVisible();
  });

  test('every locale provides every message', async ({ page }) => {
    await login(page);

    // A missing key renders as the key itself, which is the visible symptom
    // of a gap in a translation. Scan the rendered text for that pattern.
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');

    const bodyText = (await page.locator('body').innerText()).split('\n');
    const suspicious = bodyText.filter((line) => /^[a-z]+\.[a-zA-Z.]+$/.test(line.trim()));

    expect(suspicious, `missing translations: ${suspicious.join(', ')}`).toEqual([]);
  });

  test('the stored locale is used by the API-backed settings page', async ({ page }) => {
    await login(page);
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');

    // The workspace stores the locale, so a different browser gets the same
    // language as the workspace.
    await setLocale(page, 'id');

    const workspace = await (await page.request.get('/api/workspaces/current')).json();
    expect(workspace.settings.locale).toBe('id');

    // Restore.
    await setLocale(page, 'en');
    const after = await (await page.request.get('/api/workspaces/current')).json();
    expect(after.settings.locale).toBe('en');
  });
});
