import { bindable, customElement } from 'aurelia';
import { cn } from '@/lib/utils';

export type SelectOption = { value: string; label: string };

/**
 * A chevron drawn as a background image rather than an absolutely positioned
 * <svg>, so the <select> itself can be the component root.
 *
 * That matters: Aurelia spreads attributes from a containerless custom
 * element onto its template root, so an `aria-label` written on <ui-select>
 * only reaches the real <select> when the <select> is the root. With a
 * wrapper <div> the label landed on the wrapper instead and the control had
 * no accessible name at all.
 */
const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

@customElement({
  name: 'ui-select',
  containerless: true,
  template: `<select
    id.bind="id"
    name.bind="name"
    class.bind="classes"
    style.bind="style"
    value.bind="value"
    disabled.bind="disabled"
    aria-label.bind="ariaLabel || null"
    aria-invalid.bind="invalid ? 'true' : null"
    aria-describedby.bind="describedBy"
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
  /**
   * Forwarded to the <select>. Also settable through the plain `aria-label`
   * attribute, which Aurelia spreads onto the root — this bindable exists for
   * the cases where the label has to be computed.
   */
  @bindable ariaLabel = '';

  get classes(): string {
    return cn(
      'h-9 w-full appearance-none rounded-md border border-input bg-transparent bg-no-repeat pr-8 pl-3 text-sm shadow-xs outline-none transition-[color,box-shadow]',
      'bg-[position:right_0.5rem_center] bg-[size:1rem] ',
      'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40',
      'disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30',
    );
  }

  get style(): string {
    return `background-image:${CHEVRON}`;
  }
}
