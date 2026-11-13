# Multi-stage build for Hono + Aurelia SSR example

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@11

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages ./packages
COPY examples/fullstack-ssr ./examples/fullstack-ssr

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build client (if needed)
WORKDIR /app/examples/fullstack-ssr
RUN pnpm build 2>/dev/null || true

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@11

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/examples/fullstack-ssr ./examples/fullstack-ssr
COPY --from=builder /app/pnpm-lock.yaml .

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000), (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Expose port
EXPOSE 3000

# Start
CMD ["pnpm", "--cwd", "examples/fullstack-ssr", "start"]
