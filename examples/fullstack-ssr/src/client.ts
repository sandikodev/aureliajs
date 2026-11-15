import Aurelia from 'aurelia';
import { hydrateFromServer } from '@hono/aurelia-ssr/client';
import { HomePage, type HomeContext } from './pages/home.js';
import { PostDetailPage, type PostDetailContext } from './pages/post-detail.js';
import { DashboardPage, type DashboardContext } from './pages/dashboard.js';

async function bootstrap() {
  const host = document.querySelector<HTMLElement>('app-root');
  if (!host) return;

  const hydration = hydrateFromServer<Record<string, unknown>>();
  const payload = (window as unknown as { __HYDRATION__?: { component?: string } }).__HYDRATION__;
  const componentName = payload?.component;

  let componentInstance: object;
  if (componentName === 'PostDetailPage') {
    componentInstance = new PostDetailPage(hydration?.initialData as unknown as PostDetailContext);
  } else if (componentName === 'DashboardPage') {
    componentInstance = new DashboardPage(hydration?.initialData as unknown as DashboardContext);
  } else {
    componentInstance = new HomePage(hydration?.initialData as unknown as HomeContext);
  }

  try {
    await Aurelia.enhance({
      host,
      component: componentInstance,
    });
    console.log(`[Aurelia 2 SSR] Hydrated ${componentName || 'HomePage'} successfully.`);
  } catch (err) {
    console.error('[Aurelia 2 SSR] Hydration enhancement failed:', err);
  }
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
}
