import { describe, expect, it } from 'bun:test';
import { initials, relativeTime } from '../src/lib/utils';
import { AuthService } from '../src/services/auth';
import { ToastService } from '../src/services/toast';

describe('apps/web unit tests', () => {
  describe('lib/utils', () => {
    it('extracts initials cleanly from names', () => {
      expect(initials('John Doe')).toBe('JD');
      expect(initials('Alice')).toBe('A');
      expect(initials('Multiple Word Name Here')).toBe('MW');
      expect(initials('')).toBe('');
    });

    it('formats relative time for past dates', () => {
      const now = new Date();
      expect(relativeTime(now.toISOString())).toBe('just now');
      const past = new Date(Date.now() - 3600 * 1000 * 2);
      expect(relativeTime(past.toISOString())).toContain('hour');
    });
  });

  describe('AuthService (Pillar 4 & Pillar 7)', () => {
    it('applies and clears session state atomically and reactive getters work', () => {
      const auth = new AuthService();
      expect(auth.isAuthenticated).toBe(false);
      expect(auth.canManage).toBe(false);
      expect(auth.initials).toBe('?');
      expect(auth.workspaceInitials).toBe('?');

      auth.apply({
        user: { id: 'u1', email: 'owner@example.com', name: 'Ada Lovelace' },
        workspace: { id: 'w1', name: 'Analytical Engine', slug: 'analytical', plan: 'pro', role: 'owner' },
        role: 'owner',
      });

      expect(auth.isAuthenticated).toBe(true);
      expect(auth.canManage).toBe(true);
      expect(auth.initials).toBe('AL');
      expect(auth.workspaceInitials).toBe('AE');

      auth.clear();
      expect(auth.isAuthenticated).toBe(false);
      expect(auth.canManage).toBe(false);
      expect(auth.user).toBeNull();
    });
  });

  describe('ToastService (Pillar 7: LRU / TTL pruning)', () => {
    it('adds and dismisses toasts', () => {
      const toast = new ToastService();
      toast.success('Project created');
      expect(toast.toasts.length).toBe(1);
      expect(toast.toasts[0]?.message).toBe('Project created');
      expect(toast.toasts[0]?.tone).toBe('success');

      toast.dismiss(toast.toasts[0]!.id);
      expect(toast.toasts.length).toBe(0);
    });

    it('deduplicates toasts within time window', () => {
      const toast = new ToastService();
      toast.info('Loading data');
      toast.info('Loading data');
      expect(toast.toasts.length).toBe(1);
    });
  });

  describe('Security: CSV Formula Injection Prevention (Pillar 10)', () => {
    it('sanitizes formula trigger characters in CSV cells', () => {
      function sanitizeCsvCell(value: unknown): string {
        const str = String(value ?? '');
        const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
        return `"${safe.replaceAll('"', '""')}"`;
      }

      expect(sanitizeCsvCell('=1+1')).toBe(`"'=1+1"`);
      expect(sanitizeCsvCell('+cmd')).toBe(`"'+cmd"`);
      expect(sanitizeCsvCell('-123')).toBe(`"'-123"`);
      expect(sanitizeCsvCell('@SUM(A1:A10)')).toBe(`"'@SUM(A1:A10)"`);
      expect(sanitizeCsvCell('Normal Project')).toBe(`"Normal Project"`);
      expect(sanitizeCsvCell('Project with "quotes"')).toBe(`"Project with ""quotes"""`);
    });
  });

  describe('Security: Open Redirect Prevention (Pillar 10)', () => {
    it('sanitizes returnUrl and rejects protocol-relative or external URLs', () => {
      function getReturnRoute(returnUrl: string): string {
        const route = returnUrl.replace(/^\/+/, '');
        const safe = /^[a-z0-9-/?=&]+$/i.test(route) && !route.includes('//') && !route.includes(':');
        return safe && route ? route : 'overview';
      }

      expect(getReturnRoute('/projects')).toBe('projects');
      expect(getReturnRoute('billing?tab=invoices')).toBe('billing?tab=invoices');
      expect(getReturnRoute('//evil.com/hack')).toBe('overview');
      expect(getReturnRoute('https://evil.com')).toBe('overview');
      expect(getReturnRoute('javascript:alert(1)')).toBe('overview');
      expect(getReturnRoute('')).toBe('overview');
    });
  });
});
