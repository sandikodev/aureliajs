import { customElement, type ICustomElementViewModel } from 'aurelia';
import template from './home.html';
import { initialPosts, type Post } from '../data.js';

@customElement({ name: 'home-page', template: template as unknown as string })
export class HomePage implements ICustomElementViewModel {
  public static readonly title = 'Hono + Aurelia 2 SSR - Engineering Blog';

  public static async loader() {
    return { posts: initialPosts };
  }

  public posts: Post[] = [];
  public loading = false;
  public error = '';

  public async refresh(): Promise<void> {
    if (typeof fetch === 'undefined') return;
    this.loading = true;
    this.error = '';
    try {
      const res = await fetch('/api/posts', {
        headers: { Accept: 'application/json' },
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
