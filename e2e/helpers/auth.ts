import { expect, type Page } from '@playwright/test';

/**
 * Every e2e test owns a real account created through the public signup route.
 *
 * There is no demo account in production, so the suite must not borrow one.
 * Signup provisions user + workspace + owner membership + session in a single
 * transaction, which gives each test an isolated, genuinely empty workspace.
 */
export type E2EOwner = {
  email: string;
  password: string;
  name: string;
  workspaceName: string;
  workspaceId: string;
  userId: string;
};

export async function signupOwner(page: Page): Promise<E2EOwner> {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const owner = {
    email: `e2e-owner-${stamp}@example.invalid`,
    password: `E2e-${stamp}-Aa1!`,
    name: 'E2E Owner',
    workspaceName: `E2E Workspace ${stamp}`,
  };

  const response = await page.request.post('/api/auth/signup', {
    data: owner,
    headers: { 'content-type': 'application/json' },
  });
  if (!response.ok()) {
    throw new Error(`signup failed: ${response.status()} ${await response.text()}`);
  }

  const session = await response.json();
  expect(session.user?.email).toBe(owner.email);
  expect(session.role).toBe('owner');
  expect(session.workspace?.id).toBeTruthy();

  return {
    ...owner,
    userId: session.user.id as string,
    workspaceId: session.workspace.id as string,
  };
}
