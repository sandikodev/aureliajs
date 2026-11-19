import { createClientHydrator } from '@aureliajs/ssr/client';
import { HomePage } from './pages/home.js';
import { PostDetailPage } from './pages/post-detail.js';
import { DashboardPage } from './pages/dashboard.js';

// Strictly typed HTML5 JSON-script client hydration
createClientHydrator({
  components: [HomePage, PostDetailPage, DashboardPage],
});
