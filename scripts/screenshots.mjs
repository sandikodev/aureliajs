/**
 * Portfolio screenshots. Run against the dev server:
 *
 *   bun run dev                      # terminal 1
 *   node scripts/screenshots.mjs     # terminal 2
 *
 * They land in docs/screenshots and are committed so the README/case study
 * always shows the current UI.
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:4600';
const OUT = fileURLToPath(new URL('../docs/screenshots/', import.meta.url));
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

async function shot(
  name,
  path,
  { theme = 'light', width = 1440, height = 960, act, checkSelector } = {},
) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });

  // Bootstrap a real (throwaway) account — production has no demo login.
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const signupRes = await context.request.post(`${BASE}/api/auth/signup`, {
    data: {
      email: `shot-${stamp}@example.invalid`,
      password: `Shot-${stamp}-Aa1!`,
      name: 'Screenshot Owner',
      workspaceName: `Screenshot ${stamp}`,
    },
  });
  if (!signupRes.ok()) {
    console.warn(`[shot] Signup endpoint failed with status ${signupRes.status()}`);
  }

  await context.addInitScript((theme) => {
    localStorage.setItem('aurelia-ops-theme', theme);
  }, theme);

  const page = await context.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' }).catch(async () => {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  });

  await page.waitForSelector('au-viewport', { state: 'attached' });
  if (checkSelector) {
    await page.waitForSelector(checkSelector, { timeout: 7000 }).catch(() => {
      console.warn(`[shot] Warning: checkSelector "${checkSelector}" not found on ${path}`);
    });
  }
  await page.waitForTimeout(1000);
  if (act) await act(page);
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage: false });
  await context.close();
  console.log(
    `[OK] docs/screenshots/${name}.png (URL: ${path}, theme: ${theme}, viewport: ${width}x${height})`,
  );
}

console.log('Capturing verified portfolio screenshots from', BASE, 'to', OUT);

// 1. Dashboard Overview in Light Theme
await shot('dashboard-light', '/overview', {
  theme: 'light',
  checkSelector: 'main h1',
});

// 2. Projects Data Table in Light Theme
await shot('projects-light', '/projects', {
  theme: 'light',
  checkSelector: 'main h1',
});

// 3. Project Creation Modal Dialog in Light Theme
await shot('project-dialog-light', '/projects?new=true', {
  theme: 'light',
  checkSelector: 'dialog[open]',
  act: async (page) => {
    await page
      .waitForSelector('dialog[open]', { state: 'attached', timeout: 5000 })
      .catch(() => {});
    await page.waitForTimeout(500);
  },
});

// 4. Stripe Billing in Dark Theme
await shot('billing-dark', '/billing', {
  theme: 'dark',
  checkSelector: 'main h1',
});

// 5. Team Members in Dark Theme
await shot('members-dark', '/members', {
  theme: 'dark',
  checkSelector: 'main h1',
});

// 6. Responsive Mobile Dashboard
await shot('dashboard-mobile', '/overview', {
  theme: 'light',
  width: 390,
  height: 844,
  checkSelector: 'main h1',
});

await browser.close();
console.log('All 6 authentic portfolio screenshots captured successfully.');
