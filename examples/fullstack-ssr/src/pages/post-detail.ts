import { customElement } from 'aurelia';
import { hydrateFromServer } from '@hono/aurelia-ssr/client';
import template from './post-detail.html';
import type { Post } from '../data.js';

export interface PostDetailContext {
  post: Post | null;
}

@customElement({ name: 'post-detail-page', template })
export class PostDetailPage {
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

  attached() {
    const hydration = hydrateFromServer<PostDetailContext>();
    if (hydration?.initialData?.post && !this.post) {
      this.post = hydration.initialData.post;
    }
  }

  async clap() {
    if (!this.post || this.clapping) return;
    this.clapping = true;
    this.post.claps += 1;

    try {
      if (typeof fetch !== 'undefined') {
        await fetch(`/api/posts/${encodeURIComponent(this.post.slug)}/like`, {
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
        await fetch(`/api/posts/${encodeURIComponent(this.post.slug)}/comments`, {
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
