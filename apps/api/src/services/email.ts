import { env } from '../env';
import { log } from '../lib/log';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
  provider: 'resend' | 'console' | 'memory';
}

export interface InviteEmailOptions {
  to: string;
  inviterName: string;
  workspaceName?: string;
  role: string;
  acceptUrl: string;
  expiresAt: Date;
}

export type OutboxItem = SendEmailOptions & { sentAt: Date; provider: string };

/** Maximum in-memory outbox size to prevent unbounded memory growth (Pillar 1, 7 & 10) */
export const MAX_OUTBOX_SIZE = 100;

/** In-memory outbox for testing, local verification, and audit */
export const outbox: OutboxItem[] = [];

export function recordToOutbox(item: OutboxItem): void {
  if (outbox.length >= MAX_OUTBOX_SIZE) {
    outbox.shift();
  }
  outbox.push(item);
}

export function clearOutbox(): void {
  outbox.length = 0;
}

/**
 * Builds responsive, branded HTML email for workspace invitations.
 */
export function createInviteEmailHtml(opts: InviteEmailOptions): string {
  const workspace = opts.workspaceName ?? 'Aurelia Ops Workspace';
  const expiresDate = opts.expiresAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited to join ${workspace}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 24px; }
    .card { max-width: 540px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
    .badge { display: inline-block; background-color: #27272a; color: #a1a1aa; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 700; color: #fafafa; margin: 0 0 16px; }
    p { font-size: 14px; line-height: 1.6; color: #a1a1aa; margin: 0 0 20px; }
    .highlight { color: #f4f4f5; font-weight: 600; }
    .btn { display: inline-block; background-color: #3b82f6; color: #ffffff !important; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin: 8px 0 24px; transition: background-color 0.2s; }
    .btn:hover { background-color: #2563eb; }
    .footer { font-size: 12px; color: #71717a; border-top: 1px solid #27272a; padding-top: 16px; margin-top: 24px; }
    .link-alt { word-break: break-all; color: #3b82f6; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Aurelia Ops • Team Invitation</div>
    <h1>Join ${workspace}</h1>
    <p>
      <span class="highlight">${opts.inviterName}</span> has invited you to join
      <span class="highlight">${workspace}</span> as a team
      <span class="highlight">${opts.role}</span>.
    </p>
    <a href="${opts.acceptUrl}" class="btn" target="_blank" rel="noopener noreferrer">Accept Invitation</a>
    <p>This invitation will expire on <span class="highlight">${expiresDate}</span>.</p>
    <div class="footer">
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p><a href="${opts.acceptUrl}" class="link-alt">${opts.acceptUrl}</a></p>
      <p>If you were not expecting this invitation, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Builds plaintext fallback for terminal and non-HTML mail readers.
 */
export function createInviteEmailText(opts: InviteEmailOptions): string {
  const workspace = opts.workspaceName ?? 'Aurelia Ops Workspace';
  return [
    `You've been invited to join ${workspace} on Aurelia Ops`,
    ``,
    `${opts.inviterName} has invited you to join ${workspace} as a ${opts.role}.`,
    ``,
    `Accept your invitation by clicking the link below:`,
    opts.acceptUrl,
    ``,
    `This link expires on ${opts.expiresAt.toISOString()}.`,
    `If you did not expect this invitation, you can safely ignore this message.`,
  ].join('\n');
}

/** Custom email transport for dependency injection / mocking in tests */
export type EmailDispatcher = (opts: SendEmailOptions) => Promise<SendEmailResult>;

let customDispatcher: EmailDispatcher | null = null;

export function setEmailDispatcher(dispatcher: EmailDispatcher | null): void {
  customDispatcher = dispatcher;
}

/**
 * Universal email dispatcher:
 * - If a custom dispatcher is injected, delegates to it (Pillar 5).
 * - When RESEND_API_KEY is present, dispatches via Resend API (fetch-based, zero extra deps).
 * - Otherwise, safely logs via structured logger and records into bounded memory outbox.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  if (customDispatcher) {
    return customDispatcher(opts);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = opts.from ?? process.env.EMAIL_FROM ?? 'Aurelia Ops <noreply@aureliajs.dev>';

  if (apiKey && env.NODE_ENV !== 'test') {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [opts.to],
          subject: opts.subject,
          html: opts.html,
          text: opts.text,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        log.error('Resend API error', { status: res.status, error: errText, to: opts.to });
        return { success: false, error: errText, provider: 'resend' };
      }

      const data = (await res.json()) as { id: string };
      recordToOutbox({ ...opts, from, sentAt: new Date(), provider: 'resend' });
      return { success: true, id: data.id, provider: 'resend' };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log.error('Network error sending email', { error: errorMsg, to: opts.to });
      return { success: false, error: errorMsg, provider: 'resend' };
    }
  }

  // Fallback: memory + log provider
  const provider = env.NODE_ENV === 'test' ? 'memory' : 'console';
  recordToOutbox({ ...opts, from, sentAt: new Date(), provider });

  if (env.NODE_ENV !== 'test') {
    log.info('email sent (mock)', { to: opts.to, subject: opts.subject, provider });
  }

  return {
    success: true,
    id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    provider,
  };
}

/**
 * High-level helper to dispatch team invitation emails.
 */
export async function sendInviteEmail(opts: InviteEmailOptions): Promise<SendEmailResult> {
  const workspace = opts.workspaceName ?? 'Aurelia Ops';
  const html = createInviteEmailHtml(opts);
  const text = createInviteEmailText(opts);

  return sendEmail({
    to: opts.to,
    subject: `Join ${workspace} on Aurelia Ops`,
    html,
    text,
  });
}
