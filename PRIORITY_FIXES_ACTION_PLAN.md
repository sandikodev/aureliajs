# PRIORITY FIXES: examples/fullstack-ssr
## Step-by-Step Action Plan

**Status**: BEFORE SUBMISSION  
**Estimated Time**: 4-6 hours  
**Owner**: dev (Sandikodev)  
**Due**: Before sending proposal to maintainers

---

## TASK 1: Fix Home Page Component (90 min)

### Current State (WRONG)
```typescript
// examples/fullstack-ssr/src/pages/home.ts
export const HomePage = {
  name: 'HomePage',
  render(props: any) {
    const posts = props?.posts || [];
    return `<div>...</div>`;
  }
};
```

### Required Changes
- [ ] Convert to real Aurelia `@customElement` class
- [ ] Create `home.html` template file
- [ ] Add `hydrateFromServer()` usage
- [ ] Show client-side data fetching fallback
- [ ] Add TypeScript types

### Files to Create/Modify
- `examples/fullstack-ssr/src/pages/home.ts` (complete rewrite)
- `examples/fullstack-ssr/src/pages/home.html` (new)

### Expected Output
```typescript
import { customElement } from 'aurelia';
import template from './home.html';
import { hydrateFromServer } from '@hono/aurelia-ssr';

export type Post = {
  id: number;
  title: string;
  slug: string;
};

export type HomeContext = {
  posts: Post[];
};

@customElement({ name: 'home-page', template })
export class HomePage {
  posts: Post[] = [];
  loading = false;

  attached() {
    // Hydrate from server-side pre-loaded data
    const hydration = hydrateFromServer<HomeContext>();
    if (hydration?.initialData?.posts) {
      this.posts = hydration.initialData.posts;
    }
  }

  async fetchPostsIfNeeded() {
    if (this.posts.length > 0) return; // Already hydrated
    
    this.loading = true;
    try {
      const response = await fetch('/api/posts');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.posts = await response.json();
    } catch (error) {
      console.error('Failed to load posts:', error);
      this.posts = [];
    } finally {
      this.loading = false;
    }
  }
}
```

### Template (`home.html`)
```html
<template>
  <div class="home-page">
    <header>
      <h1>Hono + Aurelia SSR Example</h1>
      <p>Server-rendered, client-hydrated blog</p>
    </header>

    <main>
      <section class="posts">
        <h2>Recent Posts</h2>
        
        <div if.bind="loading" class="loading">
          Loading posts...
        </div>
        
        <ul if.bind="!loading && posts.length > 0">
          <li repeat.for="post of posts">
            <a href="${'/posts/' + post.slug}">
              <strong>${post.title}</strong>
            </a>
          </li>
        </ul>

        <p if.bind="!loading && posts.length === 0">
          No posts available.
        </p>
      </section>

      <section class="cta">
        <button click.trigger="fetchPostsIfNeeded()">
          Load More Posts
        </button>
        <p>👉 <a href="/dashboard">View Protected Dashboard</a></p>
      </section>
    </main>

    <style>
      .home-page {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
        max-width: 600px;
        margin: 0 auto;
        padding: 2rem;
      }
    </style>
  </div>
</template>
```

---

## TASK 2: Fix Dashboard Component (60 min)

### Current State (INCOMPLETE)
- Mock data loader that doesn't validate
- No auth guard shown
- No error handling

### Required Changes
- [ ] Create real Aurelia component with auth check
- [ ] Add protected route pattern
- [ ] Show data loader with error handling
- [ ] Demonstrate parallel loader execution

### Files to Create/Modify
- `examples/fullstack-ssr/src/pages/dashboard.ts` (complete)
- `examples/fullstack-ssr/src/pages/dashboard.html` (new)

### Expected Output
```typescript
import { customElement, inject } from 'aurelia';
import type { Context } from 'hono';
import template from './dashboard.html';
import { hydrateFromServer } from '@hono/aurelia-ssr';

export type DashboardContext = {
  stats: {
    title: string;
    views: number;
    posts: number;
    engagement: number;
  };
  activity: Array<{
    id: number;
    type: 'post' | 'comment' | 'like';
    action: string;
    timestamp: string;
  }>;
};

@customElement({ name: 'dashboard-page', template })
export class DashboardPage {
  stats = { title: '', views: 0, posts: 0, engagement: 0 };
  activity: DashboardContext['activity'] = [];
  loading = false;

  attached() {
    const hydration = hydrateFromServer<DashboardContext>();
    if (hydration?.initialData) {
      this.stats = hydration.initialData.stats;
      this.activity = hydration.initialData.activity;
    }
  }

  async refresh() {
    this.loading = true;
    try {
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this.stats = data.stats;
      this.activity = data.activity;
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    } finally {
      this.loading = false;
    }
  }
}
```

---

## TASK 3: Update Server Routes (90 min)

### Current State
- Routes don't actually call library functions
- No error handling
- No auth guard validation

### Files to Update
- `examples/fullstack-ssr/src/index.ts` (middleware + error handling)

### Expected Changes

**Add proper error handling**:
```typescript
// Error boundary middleware
app.onError((error, c) => {
  console.error('[aurelia-ssr]', error);
  return c.html(
    `<html><body><h1>500 Server Error</h1><p>${error.message}</p></body></html>`,
    500
  );
});

// Auth middleware validation
app.use(createAuthMiddleware({
  getUserFromToken: async (token) => {
    // MUST validate token format
    if (!token || typeof token !== 'string' || token.length < 10) {
      return null;
    }
    // Real example: validate JWT or session
    if (token === 'demo-token') {
      return { id: 'user-1', email: 'demo@example.com', name: 'Demo User' };
    }
    return null;
  },
  
  getWorkspaceFromRequest: async (c) => {
    // MUST validate workspace
    const workspace = c.req.query('ws') || 'default';
    if (!/^[a-z0-9-]+$/.test(workspace)) {
      throw new Error('Invalid workspace ID');
    }
    return { id: `ws-${workspace}`, name: workspace };
  },
  
  getRoleForUser: (user, workspace) => {
    // Real example: database lookup
    return user.id === 'user-1' ? 'admin' : 'viewer';
  },
}));
```

**Verify routes use adapter**:
```typescript
// Verify this actually calls the library
app.get('/', aurelia({
  component: HomePage,
  title: 'Home - Hono + Aurelia SSR',
  requiresAuth: false,
  loaders: {
    posts: async (c) => {
      // Real: fetch from database
      return [
        { id: 1, title: 'Getting Started', slug: 'getting-started' },
        { id: 2, title: 'Best Practices', slug: 'best-practices' },
      ];
    },
  },
}));
```

---

## TASK 4: Add Configuration Files (60 min)

### Files to Create

#### `examples/fullstack-ssr/.env.example`
```bash
# Server configuration
PORT=3000
NODE_ENV=development

# API configuration
API_URL=http://localhost:3000
WEB_ORIGIN=http://localhost:3000

# Auth configuration (demo only)
DEMO_TOKEN=demo-token
```

#### `examples/fullstack-ssr/.gitignore`
```
node_modules/
dist/
build/
.env
.env.local
.DS_Store
*.log
```

#### `examples/fullstack-ssr/Dockerfile`
```dockerfile
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@11

# Copy workspace root files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages ./packages
COPY examples/fullstack-ssr ./examples/fullstack-ssr

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build
WORKDIR /app/examples/fullstack-ssr
RUN pnpm build

# Start
EXPOSE 3000
CMD ["pnpm", "start"]
```

#### `examples/fullstack-ssr/docker-compose.yml`
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      PORT: 3000
      NODE_ENV: production
```

---

## TASK 5: Create Complete README (90 min)

### File: `examples/fullstack-ssr/README.md`

Should include:
- [ ] Quick overview (what this demonstrates)
- [ ] Prerequisites (Node 22+, pnpm)
- [ ] Installation steps
- [ ] Development workflow (`pnpm dev`)
- [ ] Understanding the code structure
- [ ] How SSR works (high-level)
- [ ] How hydration works (with code example)
- [ ] Protected routes (how auth works)
- [ ] Error handling (what happens on failure)
- [ ] Building for production
- [ ] Deploying to Node.js
- [ ] Deploying to Cloudflare Workers
- [ ] Deploying with Docker
- [ ] Testing (manual + e2e)
- [ ] Troubleshooting
- [ ] Next steps (extending the example)

---

## TASK 6: Add package.json Scripts (30 min)

### Update `examples/fullstack-ssr/package.json`

```json
{
  "name": "aurelia-ssr-example",
  "version": "0.1.0",
  "description": "Minimal Hono + Aurelia SSR example",
  "type": "module",
  "scripts": {
    "dev": "NODE_ENV=development pnpm tsx --watch src/index.ts",
    "build:client": "vite build src/client",
    "build:server": "tsc src/server.ts --outDir dist --module esnext",
    "build": "pnpm build:client && pnpm build:server",
    "start": "NODE_ENV=production pnpm tsx dist/index.js",
    "test": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx",
    "deploy:cf": "wrangler deploy --path cf-worker.ts"
  },
  "dependencies": {
    "@hono/aurelia-ssr": "workspace:*",
    "@aureliajs/shared": "workspace:*",
    "aurelia": "^2.0.0-rc.2",
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.4.0",
    "tsx": "^4.0.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

---

## TASK 7: Add TypeScript Strict Config (15 min)

### Update `examples/fullstack-ssr/tsconfig.json`
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

---

## VALIDATION CHECKLIST

Before marking complete:

- [ ] `HomePage` is a real Aurelia component with `.html` template
- [ ] `DashboardPage` demonstrates protected routes
- [ ] `NotFoundPage` is an error boundary
- [ ] All routes call the library's `aurelia()` adapter
- [ ] Hydration is shown working (`hydrateFromServer()`)
- [ ] Auth middleware validates inputs
- [ ] Error handling is comprehensive
- [ ] TypeScript strict mode passes
- [ ] `pnpm dev` runs without errors
- [ ] HTTP://localhost:3000 loads home page
- [ ] Server-rendered HTML includes `window.__HYDRATION__` payload
- [ ] Client re-uses hydrated data without re-fetch
- [ ] Protected route redirects to login when unauthenticated
- [ ] README covers all scenarios
- [ ] Docker builds and runs
- [ ] Deployment instructions are clear

---

## ESTIMATED TIMELINE

```
Task 1 (Home):        ████░░░░░░ 90 min
Task 2 (Dashboard):   ███░░░░░░░ 60 min
Task 3 (Routes):      ████░░░░░░ 90 min
Task 4 (Config):      ███░░░░░░░ 60 min
Task 5 (README):      ████░░░░░░ 90 min
Task 6 (Scripts):     ██░░░░░░░░ 30 min
Task 7 (TypeScript):  █░░░░░░░░░ 15 min
Validation:           ███░░░░░░░ 60 min
─────────────────────────────────
TOTAL:                ████████░░ 495 min (~8 hours)

Realistic (with breaks): 6-8 hours
```

---

## SUCCESS CRITERIA

✅ After completion, user should be able to:
1. Run `pnpm dev` and see a working SSR app
2. Edit component and see changes hot-reload
3. View source and see `window.__HYDRATION__` payload
4. Open DevTools and verify no duplicate API calls
5. Navigate to `/dashboard` and see auth redirect
6. Build for production and deploy to any Node.js host
7. Run in Docker without modifications
8. Submit example to maintainers with confidence

---

## NEXT STEP

Start with **TASK 1** (Home Page Component).

After that's complete, commit + test before moving to TASK 2.

Ready to start? 🚀
