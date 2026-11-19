import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// The billing suite needs STRIPE_WEBHOOK_SECRET to sign a test webhook
// payload, so the repo-root .env has to be available before the config runs.
const rootEnv = new URL('./.env', import.meta.url);
if (existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv.pathname);
}

/**
 * Starts the web + API dev servers unless they are already running.
 * CI provides Postgres separately (see .github/workflows/ci.yml) and runs
 * migrations + seed before this config is used.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4600',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'bun run dev',
        url: 'http://localhost:4600',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
