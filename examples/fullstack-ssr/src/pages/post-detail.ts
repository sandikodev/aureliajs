import { customElement } from 'aurelia';
import template from './post-detail.html';
import type { Post } from '../data.js';

export interface PostDetailContext {
  post: Post | null;
}

@customElement({ name: 'post-detail-page', template })
export class PostDetailPage {
  static title = 'Article Detail - Aurelia 2 SSR';

  /**
   * Co-located route loader: executed on server during SSR and content-negotiation
   */
  static async loader(c: any) {
    const { initialPosts } = await import('../data.js');
    const slug = c.req.param('slug');
    const found = initialPosts.find((p) => p.slug === slug);
    return { post: found ?? null };
  }

  /**
   * Co-located mutations: executed when POST/action requests hit /posts/:slug
   */
  static actions = {
    like: async (c: any) => {
      const { initialPosts } = await import('../data.js');
      const slug = c.req.param('slug');
      const post = initialPosts.find((p) => p.slug === slug);
      if (!post) return c.json({ error: 'Post not found' }, 404);
      post.claps += 1;
      return { success: true, claps: post.claps };
    },
    comment: async (c: any) => {
      const { initialPosts } = await import('../data.js');
      const slug = c.req.param('slug');
      const post = initialPosts.find((p) => p.slug === slug);
      if (!post) return c.json({ error: 'Post not found' }, 404);

      const body = await c.req.json().catch(() => ({}));
      const author = typeof body.author === 'string' && body.author.trim() ? body.author.trim() : 'Anonymous Engineer';
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      if (!text) return c.json({ error: 'Comment text is required' }, 400);

      const comment = { id: Date.now(), author, text, date: 'Just now' };
      post.comments.push(comment);
      return { success: true, comment };
    },
  };

  post: Post | null = null;
  clapping = false;
  submitting = false;
  newAuthor = '';
  newComment = '';

  constructor(initialData?: PostDetailContext) {
    if (initialData?.post) {
      this.post = initialData.post;
    }
  }

  async clap() {
    if (!this.post || this.clapping) return;
    this.clapping = true;
    this.post.claps += 1;

    try {
      if (typeof fetch !== 'undefined') {
        await fetch(`/posts/${encodeURIComponent(this.post.slug)}?_action=like`, {
          method: 'POST',
        });
      }
    } catch (err) {
      console.warn('Failed to persist clap:', err);
    } finally {
      this.clapping = false;
    }
  }

  async addComment(event?: Event) {
    if (event) {
      event.preventDefault();
    }
    if (!this.post || !this.newComment.trim() || this.submitting) return;

    this.submitting = true;
    const author = this.newAuthor.trim() || 'Anonymous Engineer';
    const text = this.newComment.trim();

    const newCommentObj = {
      id: Date.now(),
      author,
      text,
      date: 'Just now',
    };

    this.post.comments.push(newCommentObj);
    this.newComment = '';

    try {
      if (typeof fetch !== 'undefined') {
        await fetch(`/posts/${encodeURIComponent(this.post.slug)}?_action=comment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author, text }),
        });
      }
    } catch (err) {
      console.warn('Failed to persist comment:', err);
    } finally {
      this.submitting = false;
    }
  }
}
