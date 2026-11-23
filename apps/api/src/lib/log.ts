import { env, isProd } from '../env';

/**
 * Structured logging.
 *
 * In production a log line is JSON so it can be shipped and queried; in
 * development it stays readable in a terminal. The shape is the same either
 * way, which keeps the mental model simple.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const threshold = LEVELS[(process.env.LOG_LEVEL as LogLevel) ?? (isProd ? 'info' : 'debug')] ?? 20;

function emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (LEVELS[level] < threshold) return;

  if (isProd) {
    process.stdout.write(
      `${JSON.stringify({
        level,
        message,
        time: new Date().toISOString(),
        ...context,
      })}\n`,
    );
    return;
  }

  const suffix = context && Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
  process.stdout.write(`[${level}] ${message}${suffix}\n`);
}

export const log = {
  debug: (message: string, context?: Record<string, unknown>) => emit('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => emit('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => emit('error', message, context),
};

/**
 * A request id for every request.
 *
 * It is taken from the incoming `x-request-id` when a proxy set one, and
 * echoed back in the response header, so a log line can be traced back to
 * the request that produced it.
 */
export function requestId(): string {
  return crypto.randomUUID();
}

export function serviceInfo() {
  return {
    service: 'aureliajs-api',
    version: env.APP_VERSION ?? '0.1.0',
    environment: env.NODE_ENV,
  };
}
