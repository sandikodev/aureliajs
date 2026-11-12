import { bindable, customElement } from 'aurelia';
import { cn } from '@/lib/utils';

export type SelectOption = { value: string; label: string };

@customElement({
  name: 'ui-select',
  containerless: true,
  template: `<div class="relative">
    <select
      id.bind="id"
      name.bind="name"
      class.bind="classes"
      value.bind="value"
      disabled.bind="disabled"
      aria-label.bind="ariaLabel"
    >
      <option if.bind="placeholder" value="">\${placeholder}</option>
      <option repeat.for="option of options" value.bind="option.value">\${option.label}</option>
    </select>
    <svg
      class="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
    ><path d="m6 9 6 6 6-6"></path></svg>
  </div>`,
})
export class UiSelect {
  @bindable id = '';
  @bindable name = '';
  @bindable value = '';
  @bindable placeholder = '';
  @bindable options: SelectOption[] = [];
  @bindable disabled = false;
  /**
   * Forwarded to the inner <select>. A containerless component has no host
   * element in the DOM, so an `aria-label` attribute placed on the tag would
   * be dropped — and an unlabelled select is unusable with a screen reader.
   */
  @bindable ariaLabel = '';

  get classes(): string {
    return cn(
      'h-9 w-full appearance-none rounded-md border border-input bg-transparent pr-8 pl-3 text-sm shadow-xs outline-none transition-[color,box-shadow]',
      'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40',
      'disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30',
    );
  }
}
