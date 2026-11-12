import { bindable, customElement } from 'aurelia';
import { cn } from '@/lib/utils';

export type SelectOption = { value: string; label: string };

/**
 * A chevron drawn as a background image rather than an absolutely positioned
 * <svg>, so the <select> can fill the host element completely.
 */
const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

/**
 * The component keeps its host element on purpose.
 *
 * A containerless custom element is replaced by its template, and Aurelia
 * does not attach the parent's event bindings to it — so `change.trigger`
 * on a containerless <ui-select> silently never fires. (This is why
 * `ui-button` already keeps its host.) The host is given `display: contents`
 * in the stylesheet, so the inner <select> still lays out exactly as if the
 * host were not there.
 *
 * For the same reason the accessible name is forwarded explicitly: an
 * `aria-label` written on the tag would land on the host, which is not the
 * focusable element.
 */
@customElement({
  name: 'ui-select',
  template: `<select
    id.bind="id"
    name.bind="name"
    class.bind="classes"
    style.bind="style"
    value.bind="value"
    disabled.bind="disabled"
    aria-label.bind="ariaLabel || null"
    aria-invalid.bind="invalid ? 'true' : null"
    aria-describedby.bind="describedBy || null"
  >
    <option if.bind="placeholder" value="">\${placeholder}</option>
    <option repeat.for="option of options" value.bind="option.value">\${option.label}</option>
  </select>`,
})
export class UiSelect {
  @bindable id = '';
  @bindable name = '';
  @bindable value = '';
  @bindable placeholder = '';
  @bindable options: SelectOption[] = [];
  @bindable disabled = false;
  @bindable invalid = false;
  @bindable describedBy = '';
  /** Forwarded to the <select>; the host element is not focusable. */
  @bindable ariaLabel = '';

  get classes(): string {
    return cn(
      'h-9 w-full appearance-none rounded-md border border-input bg-transparent bg-no-repeat pr-8 pl-3 text-sm shadow-xs outline-none transition-[color,box-shadow]',
      'bg-[position:right_0.5rem_center] bg-[size:1rem]',
      'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40',
      'disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30',
    );
  }

  get style(): string {
    return `background-image:${CHEVRON}`;
  }
}
