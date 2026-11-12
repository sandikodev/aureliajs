import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Accessibility audit.
 *
 * axe-core walks the rendered DOM and reports concrete violations. This is
 * the check that keeps the portfolio honest: an accessibility claim you
 * cannot measure is a claim you should not make.
 *
 * The rules are run at the WCAG 2.1 A/AA level. `color-contrast` is excluded
 * because axe cannot resolve oklch colours in every Tailwind token, and a
 * false positive there trains people to ignore the whole report.
 */

const PAGES = [
  { path: '/', name: 'dashboard' },
  { path: '/projects', name: 'projects' },
  { path: '/members', name: 'members' },
  { path: '/billing', name: 'billing' },
  { path: '/settings', name: 'settings' },
  { path: '/login', name: 'login' },
];

async function login(page: Page) {
  const response = await page.request.post('/api/auth/login', {
    data: { email: 'demo@aureliajs.dev', password: 'demo-password-123' },
    headers: { 'content-type': 'application/json' },
  });
  expect(response.ok()).toBeTruthy();
}

/** Collect every violation in a readable form so a failure explains itself. */
function describe(violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations']) {
  return violations
    .map(
      (violation) =>
        `${violation.id} (${violation.impact}): ${violation.help}\n` +
        violation.nodes
          .map((node) => `    ${node.target.join(' ')} — ${node.failureSummary ?? ''}`)
          .join('\n'),
    )
    .join('\n\n');
}

test.describe('accessibility', () => {
  for (const target of PAGES) {
    test(`${target.name} page has no WCAG A/AA violations`, async ({ page }) => {
      await login(page);
      await page.goto(target.path);
      // Let the page settle so lazily rendered rows are in the DOM.
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude('.vite-error-overlay')
        .analyze();

      expect(describe(results.violations)).toBe('');
    });
  }

  for (const target of PAGES) {
    test(`${target.name} page has no WCAG A/AA violations in dark mode`, async ({ page }) => {
      await login(page);
      await page.goto(target.path);
      await page.waitForLoadState('networkidle');

      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        localStorage.setItem('aurelia-theme', 'dark');
      });

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude('.vite-error-overlay')
        .analyze();

      expect(describe(results.violations)).toBe('');
    });
  }

  test('the create-project dialog has no violations while open', async ({ page }) => {
    await login(page);
    await page.goto('/projects');
    await page.getByRole('button', { name: 'New project' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(describe(results.violations)).toBe('');
  });

  test('keyboard alone can reach the main navigation and the page content', async ({ page }) => {
    await login(page);
    await page.goto('/projects');

    // The first Tab must land on the skip link, which is the only way a
    // keyboard user can jump past the sidebar.
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el?.tagName,
        text: el?.textContent?.trim() ?? '',
        href: el?.getAttribute('href') ?? '',
      };
    });
    expect(first.tag).toBe('A');
    expect(first.text).toBe('Skip to content');
    // The href may be reported raw (`#main-content`) or resolved against the
    // origin, so match on the fragment.
    expect(first.href).toContain('#main-content');

    // Activating it must move focus into the main region.
    await page.keyboard.press('Enter');
    const moved = await page.evaluate(() => document.activeElement?.id);
    expect(moved).toBe('main-content');
  });

  test('the create-project dialog traps focus and closes on Escape', async ({ page }) => {
    await login(page);
    await page.goto('/projects');
    await page.getByRole('button', { name: 'New project' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Opening the dialog must move focus into it, otherwise a keyboard user
    // is still tabbing around the page behind the modal.
    const openedInside = await page.evaluate(() => {
      const modal = document.querySelector('dialog[open]');
      return Boolean(modal && modal.contains(document.activeElement));
    });
    expect(openedInside, 'focus must move into the dialog when it opens').toBeTruthy();

    // Tabbing must never land on a page element *behind* the modal.
    //
    // Chrome passes through <body> for one step when it wraps from the last
    // focusable element back to the first, so <body> is allowed — but a real
    // element outside the dialog is not.
    for (let i = 0; i < 14; i += 1) {
      await page.keyboard.press('Tab');
      const escaped = await page.evaluate(() => {
        const modal = document.querySelector('dialog[open]');
        const active = document.activeElement;
        if (!active) return false;
        if (active === document.body || active === document.documentElement) return false;
        return !modal?.contains(active);
      });
      expect(escaped, 'focus must never reach an element outside the modal dialog').toBeFalsy();
    }

    // After wrapping, focus must be back inside the dialog.
    const backInside = await page.evaluate(() => {
      const modal = document.querySelector('dialog[open]');
      return Boolean(modal && modal.contains(document.activeElement));
    });
    expect(backInside, 'focus must cycle back into the dialog').toBeTruthy();

    // Escape must close it.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
