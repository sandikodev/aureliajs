/**
 * Vercel Function entrypoint for the Hono API.
 *
 * `vercel.json` rewrites every `/api/:path*` request to this single Function.
 * We forward the request to the same Hono app used by the Bun/Node server, so
 * routing, auth, tenancy, error handling and CORS behave identically on every
 * runtime. A single entrypoint avoids duplicating the app's route tree.
 *
 * Do NOT import `apps/api/src/index.ts` here: that module calls `serve()` from
 * `@hono/node-server` at module scope on Node, which would try to open a port
 * inside a Function invocation.
 */
import { app } from '../apps/api/src/app';

export default { fetch: app.fetch };
