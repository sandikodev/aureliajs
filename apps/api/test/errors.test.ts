import { describe, expect, it } from 'bun:test';
import { z } from 'zod';
import { Hono } from 'hono';
import {
  HttpError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unavailable,
  issuesFromZod,
  errorResponse,
} from '../src/lib/errors';

describe('Error Handling & Sanitization (apps/api)', () => {
  it('creates HttpError instances with standard codes and status', () => {
    const custom = new HttpError(418, 'teapot', 'I am a teapot');
    expect(custom.status).toBe(418);
    expect(custom.code).toBe('teapot');
    expect(badRequest('bad request').status).toBe(400);
    expect(unauthorized().status).toBe(401);
    expect(forbidden().status).toBe(403);
    expect(notFound().status).toBe(404);
    expect(conflict('conflict').status).toBe(409);
    expect(unavailable('unavailable').status).toBe(503);
  });

  it('converts Zod errors into standard field issues', () => {
    const testSchema = z.object({
      email: z.string().email(),
      age: z.number().int().min(18),
    });

    const parsed = testSchema.safeParse({ email: 'invalid-email', age: 10 });
    expect(parsed.success).toBe(false);

    if (!parsed.success) {
      const issues = issuesFromZod(parsed.error);
      expect(issues.length).toBe(2);
      expect(issues.some((i) => i.path === 'email')).toBe(true);
      expect(issues.some((i) => i.path === 'age')).toBe(true);
    }
  });

  it('formats ZodError into 422 response via errorResponse', async () => {
    const app = new Hono();
    app.onError((err, c) => errorResponse(c, err));
    app.post('/test', () => {
      const schema = z.object({ code: z.string().min(5) });
      schema.parse({ code: 'abc' });
      return null as any;
    });

    const res = await app.request('/test', { method: 'POST' });
    expect(res.status).toBe(422);

    const body = (await res.json()) as { error: { code: string; issues: Array<{ path: string }> } };
    expect(body.error.code).toBe('validation_failed');
    expect(body.error.issues.length).toBeGreaterThan(0);
    expect(body.error.issues[0]?.path).toBe('code');
  });

  it('formats HttpError into corresponding status response', async () => {
    const app = new Hono();
    app.onError((err, c) => errorResponse(c, err));
    app.get('/forbidden', () => {
      throw forbidden('Access denied');
    });

    const res = await app.request('/forbidden');
    expect(res.status).toBe(403);

    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('forbidden');
    expect(body.error.message).toBe('Access denied');
  });

  it('masks unknown internal errors without leaking stack traces', async () => {
    const app = new Hono();
    app.onError((err, c) => errorResponse(c, err));
    app.get('/crash', () => {
      throw new Error('Database password connection failure: secret_pass_123');
    });

    const res = await app.request('/crash');
    expect(res.status).toBe(500);

    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('internal_error');
    expect(body.error.message).toBe('Something went wrong on our side');
    expect(JSON.stringify(body)).not.toContain('secret_pass_123');
  });
});
