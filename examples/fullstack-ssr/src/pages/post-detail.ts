import { customElement, type ICustomElementViewModel } from 'aurelia';
import template from './post-detail.html';
import { initialPosts, type Post } from '../data.js';

@customElement({ name: 'post-detail-page', template })
export class PostDetailPage implements ICustomElementViewModel {
  public static readonly title = ({ post }: any) =>
    post ? `${post.title} — Aurelia 2 SSR` : 'Article Not Found';

  public static readonly status = ({ post }: any) => (post ? 200 : 404);

  public static async loader(c: any) {
    const slug = c.req.param('slug');
    const found = initialPosts.find((p) => p.slug === slug);
    return { post: found ?? null };
  }

  public static readonly actions = {
    like: async (c: any) => {
      const slug = c.req.param('slug');
      const target = initialPosts.find((p) => p.slug === slug);
      if (!target) return c.json({ error: 'Post not found' }, 404);
      target.claps += 1;
      return { success: true, claps: target.claps };
    },
    comment: async (c: any) => {
      const slug = c.req.param('slug');
      const target = initialPosts.find((p) => p.slug === slug);
      if (!target) return c.json({ error: 'Post not found' }, 404);

      const body = await c.req.json().catch(() => ({}));
      const author =
        typeof body.author === 'string' && body.author.trim()
          ? body.author.trim()
          : 'Anonymous Engineer';
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      if (!text) return c.json({ error: 'Comment text is required' }, 400);

      const comment = { id: Date.now(), author, text, date: 'Just now' };
      target.comments.push(comment);
      return { success: true, comment };
    },
  };

  public post: Post | null = null;
  public clapping = false;
  public submitting = false;
  public newAuthor = '';
  public newComment = '';

  public async clap(): Promise<void> {
    if (!this.post || this.clapping) return;
    this.clapping = true;
    this.post.claps += 1;
    try {
      const res = await fetch(`${window.location.pathname}?_action=like`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const result = (await res.json()) as { claps?: number };
        if (typeof result.claps === 'number') {
          this.post.claps = result.claps;
        }
      }
    } catch (err) {
      console.error('Failed to register clap:', err);
    } finally {
      this.clapping = false;
    }
  }

  public async addComment(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.post || this.submitting || !this.newComment.trim()) return;

    this.submitting = true;
    const payload = {
      author: this.newAuthor.trim() || 'Anonymous Engineer',
      text: this.newComment.trim(),
    };

    try {
      const res = await fetch(`${window.location.pathname}?_action=comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = (await res.json()) as { comment?: any };
        if (data.comment) {
          this.post.comments.push(data.comment);
        } else {
          this.post.comments.push({
            id: Date.now(),
            author: payload.author,
            text: payload.text,
            date: 'Just now',
          });
        }
        this.newComment = '';
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      this.submitting = false;
    }
  }
}
