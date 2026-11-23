import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { clientIp } from '../src/lib/client-ip';

const probe = new Hono();
probe.get('/', (c) => c.text(clientIp(c, (c.req.query('trust') === '1'))));

describe('Client IP for rate limits (apps/api)', () => {
  it('ignores a forged header when the proxy is not trusted', async () => {
    const res = await probe.request('/', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });
    expect(await res.text()).toBe('local');
  });

  it('uses the last forwarded hop when the proxy is trusted', async () => {
    // A client-supplied first hop is appended to by the proxy; the last hop is
    // the address the trusted edge actually saw.
    const res = await probe.request('/?trust=1', {
      headers: { 'x-forwarded-for': '1.2.3.4, 203.0.113.9' },
    });
    expect(await res.text()).toBe('203.0.113.9');
  });

  it('falls back to the Cloudflare header, then to local', async () => {
    const withCf = await probe.request('/?trust=1', {
      headers: { 'cf-connecting-ip': '198.51.100.7' },
    });
    expect(await withCf.text()).toBe('198.51.100.7');

    const bare = await probe.request('/?trust=1');
    expect(await bare.text()).toBe('local');
  });
});
