import { describe, it, expect } from 'bun:test';
import { serializeState, validatePayload, stringifyPayload } from '../src/serialize.js';

describe('serializeState()', () => {
  it('preserves arbitrary application keys without opinionated regex redaction', async () => {
    // Legitimate domain keys that regex-guessing serializers mistakenly delete
    const context = {
      designToken: 'color-brand',
      txHash: '0xabc123',
      salt: '1 tsp',
      tokenCount: 4096,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const payload = await serializeState(context, { items: [1, 2] }, 'metrics-page');

    expect(payload.component).toBe('metrics-page');
    expect(payload.context.designToken).toBe('color-brand');
    expect(payload.context.txHash).toBe('0xabc123');
    expect(payload.context.salt).toBe('1 tsp');
    expect(payload.context.tokenCount).toBe(4096);
    expect(payload.context.createdAt as unknown).toBe('2026-01-01T00:00:00.000Z');
    expect(payload.initialData).toEqual({ items: [1, 2] });
    expect(validatePayload(payload)).toBe(true);
  });

  it('supports standard JSON replacer option for explicit caller-controlled filtering', async () => {
    const context: Record<string, unknown> = { email: 'a@b.com', internalSecret: 'do-not-expose' };

    const payload = await serializeState(context, undefined, 'profile', {
      replacer: (key, value) => (key === 'internalSecret' ? undefined : value),
    });

    expect(payload.context).toEqual({ email: 'a@b.com' });
  });

  it('handles circular references and omits non-serializable functions/symbols', async () => {
    const circular: Record<string, unknown> = {
      name: 'node',
      fn: () => 'ignored',
      sym: Symbol('ignored'),
    };
    circular.self = circular;

    const payload = await serializeState({}, circular, 'tree');
    expect(payload.initialData).toEqual({ name: 'node', self: '[Circular]' });
    expect(validatePayload(payload)).toBe(true);
  });

  it('escapes HTML script-breaking characters in stringifyPayload()', async () => {
    const payload = await serializeState(
      { bio: '</script><script>alert("xss")</script>' },
      undefined,
      'profile'
    );

    const json = stringifyPayload(payload);
    expect(json).not.toContain('</script>');
    expect(json).toContain('\\u003c/script\\u003e');
    expect(JSON.parse(json).context.bio).toBe('</script><script>alert("xss")</script>');
  });
});
