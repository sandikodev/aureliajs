import { createClientHydrator } from '@aureliajs/ssr/client';
import { HomePage } from './pages/home.aux';
import { PostDetailPage } from './pages/post-detail.aux';
import { DashboardPage } from './pages/dashboard.aux';

// Strictly typed HTML5 JSON-script client hydration
createClientHydrator({
  components: [HomePage, PostDetailPage, DashboardPage],
});
