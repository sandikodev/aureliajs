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

const browser = await chromium.launch();

async function shot(name, path, { theme = 'light', width = 1440, height = 960, act } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  await context.addInitScript((theme) => {
    localStorage.setItem('aurelia-ops-theme', theme);
  }, theme);
  const page = await context.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  if (act) await act(page);
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage: false });
  await context.close();
  console.log(`docs/screenshots/${name}.png`);
}

await shot('dashboard-light', '/');
await shot('projects-light', '/projects');
await shot('project-dialog-light', '/projects', {
  act: async (page) => {
    await page.getByRole('button', { name: 'New project' }).click();
    await page.waitForTimeout(300);
  },
});
await shot('billing-dark', '/billing', { theme: 'dark' });
await shot('members-dark', '/members', { theme: 'dark' });
await shot('dashboard-mobile', '/', { width: 390, height: 844 });

await browser.close();
