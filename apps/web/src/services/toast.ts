/**
 * ToastService — global transient notification bus.
 *
 * Usage from any page or service:
 *
 *   const toast = resolve(ToastService);
 *   toast.success('Project created.');
 *   toast.error('Could not save.');
 *   toast.info('Link copied to clipboard.');
 *
 * Toasts auto-dismiss after `duration` ms (default 4 000).
 * The `<ui-toaster>` component in app.html observes `toasts` and renders them.
 */

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

let nextToastId = 1;
const MAX_TOASTS = 4;
const DEDUP_WINDOW_MS = 1_500;

export class ToastService {
  /** Reactive array — ui-toaster binds to this. */
  toasts: Toast[] = [];

  private timers = new Map<number, ReturnType<typeof setTimeout>>();
  private lastAdded = new Map<string, number>();
  private listeners: (() => void)[] = [];

  onChange(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  success(message: string, duration = 4_000): void {
    this.add(message, 'success', duration);
  }

  error(message: string, duration = 6_000): void {
    this.add(message, 'error', duration);
  }

  info(message: string, duration = 4_000): void {
    this.add(message, 'info', duration);
  }

  warning(message: string, duration = 5_000): void {
    this.add(message, 'warning', duration);
  }

  dismiss(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  private add(message: string, tone: ToastTone, duration: number): void {
    const key = `${tone}:${message}`;
    const now = Date.now();

    // Prune stale dedup entries to prevent unbounded memory leak
    for (const [k, time] of this.lastAdded.entries()) {
      if (now - time > DEDUP_WINDOW_MS * 4) {
        this.lastAdded.delete(k);
      }
    }

    const prevTime = this.lastAdded.get(key);

    if (prevTime && now - prevTime < DEDUP_WINDOW_MS) {
      const existing = this.toasts.find((t) => t.message === message && t.tone === tone);
      if (existing) {
        clearTimeout(this.timers.get(existing.id));
        const timer = setTimeout(() => this.dismiss(existing.id), duration);
        this.timers.set(existing.id, timer);
        return;
      }
    }
    this.lastAdded.set(key, now);

    if (this.toasts.length >= MAX_TOASTS) {
      const oldest = this.toasts[0];
      if (oldest) {
        this.dismiss(oldest.id);
      }
    }

    const id = nextToastId++;
    this.toasts = [...this.toasts, { id, message, tone }];
    const timer = setTimeout(() => this.dismiss(id), duration);
    this.timers.set(id, timer);
    this.notify();
  }
}
