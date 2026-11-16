import { createClientHydrator } from '@hono/aurelia-ssr/client';
import { HomePage } from './pages/home.js';
import { PostDetailPage } from './pages/post-detail.js';
import { DashboardPage } from './pages/dashboard.js';

createClientHydrator({
  components: {
    HomePage,
    PostDetailPage,
    DashboardPage,
  },
  target: 'app-root',
  onHydrated: (name) => {
    console.log(`[Aurelia 2 SSR] Hydrated ${name} successfully.`);
  },
  onError: (err) => {
    console.error('[Aurelia 2 SSR] Hydration enhancement failed:', err);
  },
});
