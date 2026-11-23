import { describe, expect, test } from 'bun:test';
import {
  SESSION_COOKIE,
  SESSION_HINT_COOKIE,
  SESSION_TTL_SECONDS,
  sessionCookie,
  sessionHintCookie,
} from '../src/lib/session';

describe('session cookies', () => {
  test('the real session cookie stays HttpOnly', () => {
    expect(SESSION_COOKIE).toBe('aurelia_session');
    expect(sessionCookie()).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });
  });

  test('the static-landing hint is readable but grants no access on its own', () => {
    expect(SESSION_HINT_COOKIE).toBe('aurelia_ops_authed');
    expect(sessionHintCookie()).toMatchObject({
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });
  });
});
