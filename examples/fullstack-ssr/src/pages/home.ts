import { customElement } from 'aurelia';
import { hydrateFromServer } from '@hono/aurelia-ssr/client';
import template from './home.html';
import type { Post } from '../data.js';
import { SsrBadge } from '../components/ssr-badge.aux';

export interface HomeContext {
  posts: Post[];
}

@customElement({
  name: 'home-page',
  template,
  dependencies: [SsrBadge],
})
export class HomePage {
  posts: Post[] = [];
  loading = false;
  error = '';

  constructor(initialData?: HomeContext) {
    if (initialData?.posts) {
      this.posts = initialData.posts;
    }
  }

  attached() {
    const hydration = hydrateFromServer<HomeContext>();
    if (hydration?.initialData?.posts && this.posts.length === 0) {
      this.posts = hydration.initialData.posts;
    } else if (this.posts.length === 0 && typeof window !== 'undefined') {
      this.refresh();
    }
  }

  async refresh() {
    if (typeof fetch === 'undefined') return;
    this.loading = true;
    this.error = '';
    try {
      const res = await fetch('/api/posts', {
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      this.posts = (await res.json()) as Post[];
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.loading = false;
    }
  }
}
