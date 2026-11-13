# syntax=docker/dockerfile:1

# ---------------------------------------------------------------- build
FROM node:22-alpine AS build

RUN corepack enable

WORKDIR /app

# Copy the manifests first so the dependency layer is cached until they change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

COPY . .

# The shared package has to be built before the API and the web app.
RUN pnpm --filter @aureliajs/shared build \
 && pnpm --filter @aureliajs/api build \
 && pnpm --filter @aureliajs/web build

# ---------------------------------------------------------------- runtime
FROM node:22-alpine AS runtime

RUN corepack enable \
 && addgroup -S aurelia && adduser -S aurelia -G aurelia

WORKDIR /app

ENV NODE_ENV=production \
    PORT=4601 \
    NODE_OPTIONS=--enable-source-maps

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
# pnpm links each workspace package's dependencies into its own
# node_modules; the shared package needs zod at runtime.
COPY --from=build /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist

# The built web bundle is served by the API process, so the whole app is
# one container and one origin — no CORS, no second deployment.
COPY --from=build /app/apps/web/dist ./web

USER aurelia

EXPOSE 4601

# The readiness probe checks the database, the liveness probe only checks
# that the process is up.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4601)+'/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/api/dist/server.js"]
