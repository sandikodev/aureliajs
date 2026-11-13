import { customElement, resolve } from 'aurelia';
import { ToastService } from '@/services/toast';

/**
 * Toaster — renders the global toast stack in the bottom-right corner.
 *
 * Mount once in app.html:
 *   <ui-toaster></ui-toaster>
 *
 * The component is not containerless so its host element exists in the DOM
 * and the `fixed` stacking context is self-contained.
 */
@customElement({
  name: 'ui-toaster',
  template: `
    <div
      class="fixed right-4 bottom-4 z-50 flex flex-col gap-2 w-80"
      aria-live="polite"
      aria-label="Notifications"
    >
      <div
        repeat.for="toast of toastSvc.toasts"
        class="flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg animate-slide-up \${toneClasses(toast.tone)}"
        role="status"
      >
        <span class="mt-0.5 shrink-0" inner-html.bind="icon(toast.tone)" aria-hidden="true"></span>
        <span class="flex-1 leading-snug">\${toast.message}</span>
        <button
          type="button"
          class="shrink-0 rounded-md p-0.5 opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100"
          click.trigger="toastSvc.dismiss(toast.id)"
          aria-label="Dismiss notification"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  `,
})
export class UiToaster {
  readonly toastSvc = resolve(ToastService);

  toneClasses(tone: string): string {
    switch (tone) {
      case 'success':
        return 'bg-card border-success/30 text-foreground';
      case 'error':
        return 'bg-card border-destructive/40 text-foreground';
      case 'warning':
        return 'bg-card border-warning/40 text-foreground';
      case 'info':
      default:
        return 'bg-card border-border text-foreground';
    }
  }

  icon(tone: string): string {
    switch (tone) {
      case 'success':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
      case 'error':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--destructive)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>`;
      case 'warning':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4m0 4h.01"/></svg>`;
      case 'info':
      default:
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>`;
    }
  }
}
