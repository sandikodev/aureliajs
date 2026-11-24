/**
 * Postgres/driver error translation.
 *
 * Pre-checks make error messages friendlier, but only the unique index is a
 * real guarantee under concurrency. Drizzle wraps driver errors in
 * `DrizzleQueryError`, so the Postgres code may live on `.cause` rather than
 * on the error itself — check both levels.
 */
export function isUniqueViolation(error: unknown): boolean {
  for (let current = error; current && typeof current === 'object'; ) {
    if ('code' in current && (current as { code?: unknown }).code === '23505') return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
