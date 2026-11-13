/**
 * Home Page Component
 * 
 * Demonstrates:
 * - Server-side rendering with real Aurelia @customElement
 * - Data loader integration (posts)
 * - Client-side hydration with hydrateFromServer()
 * - Fallback data fetching when not hydrated
 */

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
  error = '';

  /**
   * Attached lifecycle: Called when component is added to DOM.
   * Hydrate from server-side pre-loaded data if available.
   */
  attached() {
    // Try to hydrate from server
    const hydration = hydrateFromServer<HomeContext>();

    if (hydration?.initialData?.posts) {
      // Server rendered and passed data
      this.posts = hydration.initialData.posts;
    } else if (this.posts.length === 0) {
      // Not hydrated, fetch if needed
      this.fetchPostsIfNeeded();
    }
  }

  /**
   * Fetch posts from API if not already loaded.
   * This prevents duplicate API calls when hydrated from server.
   */
  async fetchPostsIfNeeded() {
    if (this.posts.length > 0) return; // Already have data
    if (this.loading) return; // Already loading

    this.loading = true;
    this.error = '';

    try {
      const response = await fetch('/api/posts');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.posts = await response.json();
    } catch (err) {
      console.error('[home-page] Failed to load posts:', err);
      this.error = err instanceof Error ? err.message : 'Failed to load posts';
      this.posts = [];
    } finally {
      this.loading = false;
    }
  }

  /**
   * Refresh posts from server.
   */
  async refresh() {
    this.posts = [];
    await this.fetchPostsIfNeeded();
  }
}
