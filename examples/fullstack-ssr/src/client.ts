import { createClientHydrator } from '@hono/aurelia/client';
import { HomePage } from './pages/home.js';
import { PostDetailPage } from './pages/post-detail.js';
import { DashboardPage } from './pages/dashboard.js';

// Streamlined array-based hydration with automatic target detection & state injection
createClientHydrator([HomePage, PostDetailPage, DashboardPage]);
