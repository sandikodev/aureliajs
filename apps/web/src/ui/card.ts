import { bindable, customElement } from 'aurelia';
import { cn } from '@/lib/utils';

@customElement({
  name: 'ui-card',
  containerless: true,
  template: `<div class.bind="classes"><au-slot></au-slot></div>`,
})
export class UiCard {
  @bindable padded = false;

  get classes(): string {
    return cn('rounded-xl border bg-card text-card-foreground shadow-sm', this.padded ? 'p-5' : '');
  }
}

@customElement({
  name: 'ui-card-header',
  containerless: true,
  template: `<div class="flex flex-col gap-1 px-5 pt-5"><au-slot></au-slot></div>`,
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
