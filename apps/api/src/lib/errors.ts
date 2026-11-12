import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export type FieldIssue = { path: string; message: string };

export class HttpError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly issues?: FieldIssue[],
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string, issues?: FieldIssue[]) =>
  new HttpError(400, 'bad_request', message, issues);
export const unauthorized = (message = 'You must sign in first') =>
  new HttpError(401, 'unauthorized', message);
export const forbidden = (message = 'You do not have access to this resource') =>
  new HttpError(403, 'forbidden', message);
export const notFound = (message = 'Resource not found') =>
  new HttpError(404, 'not_found', message);
export const conflict = (message: string) => new HttpError(409, 'conflict', message);
export const unavailable = (message: string) => new HttpError(503, 'unavailable', message);

/** Turn a ZodError into our public API error shape. */
export function issuesFromZod(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): FieldIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.') || '_',
    message: issue.message,
  }));
}

export function errorResponse(c: Context, error: unknown) {
  if (error instanceof HttpError) {
    return c.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.issues ? { issues: error.issues } : {}),
        },
      },
      error.status,
    );
  }

  console.error('[api] unhandled error', error);
  return c.json(
    { error: { code: 'internal_error', message: 'Something went wrong on our side' } },
    500,
  );
}
