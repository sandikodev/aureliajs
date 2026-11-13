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

let _nextId = 1;

export class ToastService {
  /** Reactive array — ui-toaster binds to this. */
  toasts: Toast[] = [];

  private timers = new Map<number, ReturnType<typeof setTimeout>>();

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
  }

  private add(message: string, tone: ToastTone, duration: number): void {
    const id = _nextId++;
    this.toasts = [...this.toasts, { id, message, tone }];
    const timer = setTimeout(() => this.dismiss(id), duration);
    this.timers.set(id, timer);
  }
}
