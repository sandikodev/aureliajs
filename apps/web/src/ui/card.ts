import { bindable, customElement } from 'aurelia';
import { cn } from '@/lib/utils';

/**
 * Card shell. Two layout patterns:
 *
 * 1. **Padded card** — use `padded` prop for simple content (KPI tiles, forms):
 *    ```html
 *    <ui-card padded>...</ui-card>
 *    ```
 *
 * 2. **Flush table card** — do NOT wrap the table in `<ui-card-content>`.
 *    Put `<ui-card-header>` first, then a plain `<div class="overflow-x-auto">`
 *    directly inside the card. The table cells carry their own `px-*` so the
 *    thead/tbody rows reach the card edge with no extra padding:
 *    ```html
 *    <ui-card>
 *      <ui-card-header>…</ui-card-header>
 *      <div class="overflow-x-auto"><table>…</table></div>
 *    </ui-card>
 *    ```
 *
 * Note: `containerless` is intentionally removed. Keeping the host element
 * lets parent layouts (flex/grid) size the card correctly and avoids the
 * Aurelia caveat where attributes on a containerless host are silently dropped.
 * `display: contents` is NOT set here — the card is a block-level box.
 */
@customElement({
  name: 'ui-card',
  template: `<div class.bind="classes"><au-slot></au-slot></div>`,
})
export class UiCard {
  @bindable({ set: (v) => v === '' || v === true || v === 'true' }) padded = false;

  get classes(): string {
    return cn('rounded-xl border bg-card text-card-foreground shadow-sm h-full', this.padded ? 'p-5' : '');
  }
}

@customElement({
  name: 'ui-card-header',
  containerless: true,
  template: `<div class="flex flex-col gap-1 px-5 pt-5 pb-4"><au-slot></au-slot></div>`,
})
export class UiCardHeader {}

@customElement({
  name: 'ui-card-title',
  containerless: true,
  template: `<h3 class="text-base leading-none font-semibold tracking-tight"><au-slot></au-slot></h3>`,
})
export class UiCardTitle {}

@customElement({
  name: 'ui-card-description',
  containerless: true,
  template: `<p class="text-sm text-muted-foreground"><au-slot></au-slot></p>`,
})
export class UiCardDescription {}

@customElement({
  name: 'ui-card-content',
  containerless: true,
  template: `<div class="px-5 py-4"><au-slot></au-slot></div>`,
})
export class UiCardContent {}

@customElement({
  name: 'ui-card-footer',
  containerless: true,
  template: `<div class="flex items-center gap-2 px-5 pb-5"><au-slot></au-slot></div>`,
})
export class UiCardFooter {}
