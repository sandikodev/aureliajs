# syntax=docker/dockerfile:1

# ---------------------------------------------------------------- build
FROM oven/bun:1-alpine AS build

WORKDIR /app

COPY package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/shared/package.json apps/shared/
COPY packages/vite-plugin-aux/package.json packages/vite-plugin-aux/

RUN bun install

COPY . .

# Build workspace dependencies before API and web apps
RUN bun run --filter @aurelia-ops/shared build \
 && bun run --filter @aureliajs/vite-plugin-aux build \
 && bun run --filter @aureliajs/api build \
 && bun run --filter @aureliajs/web build

# ---------------------------------------------------------------- runtime
FROM oven/bun:1-alpine AS runtime

RUN addgroup -S aurelia && adduser -S aurelia -G aurelia

WORKDIR /app

ENV NODE_ENV=production \
    PORT=4601

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=build /app/apps/shared/package.json ./apps/shared/package.json
COPY --from=build /app/apps/shared/dist ./apps/shared/dist

# The built web bundle is served by the API process, so the whole app is
# one container and one origin — no CORS, no second deployment.
COPY --from=build /app/apps/web/dist ./web

USER aurelia

EXPOSE 4601

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:'+(process.env.PORT||4601)+'/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "apps/api/dist/server.js"]
