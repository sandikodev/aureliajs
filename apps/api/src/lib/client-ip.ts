import type { Context } from 'hono';
import { env } from '../env';

/**
 * A rate-limit key for the caller, without trusting a header the caller controls.
 *
 * `x-forwarded-for` is freely forgeable unless a reverse proxy *overwrites* it.
 * We therefore read it only when the operator explicitly opts in with
 * TRUST_PROXY=1 (i.e. "this process is only reachable through our proxy"), and
 * take the LAST hop — the address the trusted edge actually saw. Taking the
 * first hop is the classic bypass: a client sends `X-Forwarded-For: 1.2.3.4`
 * and a proxy that appends produces `1.2.3.4, <real-ip>`.
 *
 * Without the opt-in we return a constant. That is deliberate: concurrency is
 * then limited per account (login keys already include the email) instead of
 * handing an attacker a one-header rate-limit bypass. Set TRUST_PROXY=1 only
 * when the app is not directly reachable from the public internet.
 */
export function clientIp(c: Context, trustProxy: boolean = env.TRUST_PROXY): string {
  if (!trustProxy) return 'local';

  const hops = (c.req.header('x-forwarded-for') ?? '')
    .split(',')
    .map((hop) => hop.trim())
    .filter(Boolean);
  const fromProxy = hops.at(-1);
  if (fromProxy) return fromProxy;

  // Cloudflare sets its own header; many hosted proxies do the same.
  return c.req.header('cf-connecting-ip')?.trim() || 'local';
}
