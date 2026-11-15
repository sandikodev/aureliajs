/**
 * Shared in-memory data store for the Fullstack Aurelia 2 SSR + Hono reference app.
 */

export interface Comment {
  id: number;
  author: string;
  text: string;
  date: string;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  readTime: string;
  claps: number;
  comments: Comment[];
}

export interface DashboardStats {
  title: string;
  views: number;
  posts: number;
  engagement: number;
}

export interface ActivityItem {
  id: number;
  type: 'post' | 'like' | 'comment';
  action: string;
  timestamp: string;
}

export const initialPosts: Post[] = [
  {
    id: 1,
    title: 'Hono + Aurelia 2 SSR Architecture',
    slug: 'hono-aurelia-ssr-architecture',
    category: 'Architecture',
    excerpt: 'Deep-dive into executing isolated virtual DOM scopes per request in Node and edge runtimes.',
    content: `Server-Side Rendering (SSR) in Aurelia 2 delivers pre-rendered HTML straight from the server, eliminating First Contentful Paint (FCP) latency and guaranteeing full SEO indexing.

Unlike Virtual-DOM frameworks that serialize virtual node fiber trees, Aurelia 2 works directly with standard DOM elements and light-DOM slot projections (<au-slot>). When combined with Hono's ultra-lightweight HTTP router, we achieve single-digit millisecond TTFB and instant progressive hydration.`,
    author: 'Sandiko Dev',
    date: 'Nov 14, 2026',
    readTime: '4 min read',
    claps: 128,
    comments: [
      { id: 1, author: 'Alex Chen', text: 'Incredible performance compared to Next.js fiber reconciliation!', date: '2 hours ago' },
      { id: 2, author: 'Sarah Connor', text: 'The request-scoped JSDOM isolation is clean and safe.', date: '30 minutes ago' },
    ],
  },
  {
    id: 2,
    title: 'Zero-FOUC Real DOM Server Rendering',
    slug: 'zero-fouc-real-dom',
    category: 'Frontend Engineering',
    excerpt: 'Eliminating the Flash of Unstyled Content using request-scoped BrowserPlatform synchronization.',
    content: `A common pitfall in single-page applications is FOUC (Flash of Unstyled Content) during initial layout rendering.

In Aurelia 2 SSR, the HTML document is assembled on the server with complete stylesheets, embedded layout markup, and critical template interpolations (\${expr}). The browser paints the real rendered HTML immediately before client JavaScript finishes executing.`,
    author: 'Sandiko Dev',
    date: 'Nov 13, 2026',
    readTime: '3 min read',
    claps: 94,
    comments: [
      { id: 1, author: 'Marcus Aurelius', text: 'Native DOM standards make styling predictable and clean.', date: 'Yesterday' },
    ],
  },
  {
    id: 3,
    title: 'State Hydration Without Duplicate Fetching',
    slug: 'state-hydration',
    category: 'Data Transfer',
    excerpt: 'Serializing server loaders into window.__HYDRATION__ to prevent redundant client network calls.',
    content: `When a page renders on the server, data loaders resolve databases and cache entries. 

If the client application blindly refetches the same REST or GraphQL endpoints upon mounting, server resources are wasted. In @hono/aurelia-ssr, loaders serialize their payload into a secure JSON script block, which hydrateFromServer() recovers instantly.`,
    author: 'Sandiko Dev',
    date: 'Nov 12, 2026',
    readTime: '5 min read',
    claps: 156,
    comments: [],
  },
];

export const dashboardStats: DashboardStats = {
  title: 'Production Metrics',
  views: 14250,
  posts: 3,
  engagement: 94,
};

export const activityStream: ActivityItem[] = [
  { id: 1, type: 'post', action: 'Published new SSR architecture guide', timestamp: '10 minutes ago' },
  { id: 2, type: 'like', action: 'Received 12 claps on Zero-FOUC article', timestamp: '1 hour ago' },
  { id: 3, type: 'comment', action: 'New comment from Alex Chen verified', timestamp: '2 hours ago' },
  { id: 4, type: 'post', action: 'Submodule gitlink synchronized across monorepo', timestamp: '4 hours ago' },
];
