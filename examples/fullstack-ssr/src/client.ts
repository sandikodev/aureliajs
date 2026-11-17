import { createClientHydrator } from '@aureliajs/ssr/client';
import { HomePage } from './pages/home.aux';
import { PostDetailPage } from './pages/post-detail.aux';
import { DashboardPage } from './pages/dashboard.aux';

// Zero-boilerplate automated client hydration with auto-injected initialData
createClientHydrator([HomePage, PostDetailPage, DashboardPage]);
