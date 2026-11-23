import { describe, expect, it } from 'bun:test';
import { createApp } from '../src/app';

describe('Application Middleware & Security (apps/api)', () => {
  const app = createApp();

  it('serves /health with 200 and service metadata', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);

    const body = (await res.json()) as { ok: boolean; service: string; uptimeSeconds: number };
    expect(body.ok).toBe(true);
    expect(body.service).toBe('aureliajs-api');
    expect(typeof body.uptimeSeconds).toBe('number');
  });

  it('returns 404 for unknown endpoints in uniform error shape', async () => {
    const res = await app.request('/unknown-endpoint-xyz');
    expect(res.status).toBe(404);

    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('not_found');
  });

  it('generates or preserves x-request-id header on every response', async () => {
    const res = await app.request('/health');
    const reqId = res.headers.get('x-request-id');
    expect(reqId).not.toBeNull();
    expect(reqId?.length).toBeGreaterThan(0);

    const customRes = await app.request('/health', {
      headers: { 'x-request-id': 'custom-req-id-12345' },
    });
    expect(customRes.headers.get('x-request-id')).toBe('custom-req-id-12345');
  });

  it('applies secure headers', async () => {
    const res = await app.request('/health');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
  });

  it('enforces payload size limits (rejects >1MB with 413)', async () => {
    // Generate a payload slightly larger than 1MB
    const largePayload = JSON.stringify({ data: 'x'.repeat(1024 * 1024 + 100) });

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: largePayload,
    });

    expect(res.status).toBe(413);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('payload_too_large');
  });
});
