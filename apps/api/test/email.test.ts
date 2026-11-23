import { describe, expect, it, beforeEach } from 'bun:test';
import {
  sendEmail,
  sendInviteEmail,
  createInviteEmailHtml,
  createInviteEmailText,
  outbox,
  clearOutbox,
} from '../src/services/email';

describe('Transactional Email Service (apps/api)', () => {
  beforeEach(() => {
    clearOutbox();
  });

  it('builds valid HTML invitation email containing all parameters', () => {
    const expiresAt = new Date('2026-12-01T00:00:00.000Z');
    const html = createInviteEmailHtml({
      to: 'developer@acme.com',
      inviterName: 'Sandikodev',
      workspaceName: 'Enterprise Studio',
      role: 'admin',
      acceptUrl: 'http://localhost:4600/invite?token=secret123',
      expiresAt,
    });

    expect(html).toContain('Enterprise Studio');
    expect(html).toContain('Sandikodev');
    expect(html).toContain('admin');
    expect(html).toContain('http://localhost:4600/invite?token=secret123');
    expect(html).toContain('Dec 1, 2026');
  });

  it('builds valid plaintext fallback for terminal and accessibility', () => {
    const expiresAt = new Date('2026-12-01T00:00:00.000Z');
    const text = createInviteEmailText({
      to: 'developer@acme.com',
      inviterName: 'Sandikodev',
      workspaceName: 'Enterprise Studio',
      role: 'member',
      acceptUrl: 'http://localhost:4600/invite?token=secret123',
      expiresAt,
    });

    expect(text).toContain('Sandikodev has invited you to join Enterprise Studio as a member.');
    expect(text).toContain('http://localhost:4600/invite?token=secret123');
  });

  it('dispatches email and records into outbox ledger', async () => {
    const result = await sendEmail({
      to: 'target@example.com',
      subject: 'Test Subject',
      html: '<p>Hello World</p>',
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('memory');
    expect(outbox.length).toBe(1);
    expect(outbox[0]?.to).toBe('target@example.com');
    expect(outbox[0]?.subject).toBe('Test Subject');
  });

  it('dispatches invite email with sendInviteEmail helper', async () => {
    const result = await sendInviteEmail({
      to: 'team@example.com',
      inviterName: 'Jane Doe',
      workspaceName: 'Acme Corp',
      role: 'admin',
      acceptUrl: 'http://localhost:4600/invite?token=xyz789',
      expiresAt: new Date(Date.now() + 86400000),
    });

    expect(result.success).toBe(true);
    expect(outbox.length).toBe(1);
    expect(outbox[0]?.subject).toBe('Join Acme Corp on Aurelia Ops');
    expect(outbox[0]?.html).toContain('Jane Doe');
    expect(outbox[0]?.html).toContain('admin');
  });
});
