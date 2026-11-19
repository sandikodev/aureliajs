import { createClientHydrator } from '@aureliajs/ssr/client';
import { HomePage } from './pages/home';
import { PostDetailPage } from './pages/post-detail';
import { DashboardPage } from './pages/dashboard';

// Strictly typed HTML5 JSON-script client hydration
createClientHydrator({
  components: [HomePage, PostDetailPage, DashboardPage],
});
