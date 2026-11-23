import type { MiddlewareHandler } from 'hono';
import { log, requestId } from '../lib/log';

/**
 * Request logging.
 *
 * Every request gets an id, and the line records what happened and how long
 * it took. The id is echoed back in `x-request-id` so a user can quote it
 * and a log line can be found without guessing which request it was.
 */
export const requestLogger = (): MiddlewareHandler => async (c, next) => {
  const id = c.req.header('x-request-id') ?? requestId();
  const started = Date.now();

  c.set('requestId', id);
  c.header('x-request-id', id);

  try {
    await next();
  } catch (error) {
    // The error handler turns this into a response; log it here with the
    // request context so a 500 is never anonymous.
    log.error('request failed', {
      requestId: id,
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      durationMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const durationMs = Date.now() - started;
  const status = c.res.status;
  const path = new URL(c.req.url).pathname;

  const context = {
    requestId: id,
    method: c.req.method,
    path,
    status,
    durationMs,
  };

  if (status >= 500) {
    log.error('request', context);
  } else if (status >= 400) {
    log.warn('request', context);
  } else {
    log.info('request', context);
  }
};
