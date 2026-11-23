import { describe, expect, it } from 'bun:test';
import { createApp } from '../src/app';
import { requireRole, type TenantScope } from '../src/middleware/tenant';

describe('API Route Security & Validation Machine (apps/api)', () => {
  const app = createApp();

  describe('Unauthenticated Request Protection', () => {
    it('blocks access to protected endpoints without session cookie (401 unauthorized)', async () => {
      const endpoints = [
        '/api/projects',
        '/api/members',
        '/api/workspaces',
        '/api/overview',
        '/api/billing',
      ];

      for (const path of endpoints) {
        const res = await app.request(path);
        expect(res.status).toBe(401);

        const body = (await res.json()) as { error: { code: string; message: string } };
        expect(body.error.code).toBe('unauthorized');
      }
    });
  });

  describe('Authentication Route Validation (Zod Schemas)', () => {
    it('rejects login with malformed email with 422 validation_failed', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email', password: 'password123' }),
      });

      expect(res.status).toBe(422);
      const body = (await res.json()) as { error: { code: string; issues: Array<{ path: string }> } };
      expect(body.error.code).toBe('validation_failed');
      expect(body.error.issues.some((i) => i.path === 'email')).toBe(true);
    });

    it('rejects login with empty body with 422 validation_failed', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(422);
      const body = (await res.json()) as { error: { code: string; issues: Array<{ path: string }> } };
      expect(body.error.code).toBe('validation_failed');
      expect(body.error.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    const memberTenant: TenantScope = {
      workspaceId: 'w-1',
      workspaceName: 'Acme Corp',
      plan: 'pro',
      userId: 'u-1',
      actorName: 'Alice Member',
      role: 'member',
    };

    const adminTenant: TenantScope = {
      ...memberTenant,
      role: 'admin',
    };

    const ownerTenant: TenantScope = {
      ...memberTenant,
      role: 'owner',
    };

    it('allows owner and admin roles for administrative operations', () => {
      expect(() => requireRole(ownerTenant, 'owner', 'admin')).not.toThrow();
      expect(() => requireRole(adminTenant, 'owner', 'admin')).not.toThrow();
    });

    it('strictly forbids member role when owner or admin is required', () => {
      expect(() => requireRole(memberTenant, 'owner', 'admin')).toThrow();
      try {
        requireRole(memberTenant, 'owner', 'admin');
      } catch (err: unknown) {
        const error = err as { status: number; code: string };
        expect(error.status).toBe(403);
        expect(error.code).toBe('forbidden');
      }
    });

    it('only allows owner when strictly owner-scoped', () => {
      expect(() => requireRole(ownerTenant, 'owner')).not.toThrow();
      expect(() => requireRole(adminTenant, 'owner')).toThrow();
      expect(() => requireRole(memberTenant, 'owner')).toThrow();
    });
  });
});
