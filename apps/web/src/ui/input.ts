import { bindable, customElement } from 'aurelia';
import { cn } from '@/lib/utils';

/**
 * The component keeps its host element on purpose.
 *
 * A containerless custom element is replaced by its template, and Aurelia
 * does not reliably attach the parent's event bindings to it. Keeping the
 * host means `input.trigger` and `change.trigger` work; the host is given
 * `display: contents` in the stylesheet so the layout is unchanged.
 *
 * The accessible name is forwarded explicitly because the host is not the
 * focusable element — an `aria-label` written on the tag would land on the
 * host instead of the input.
 */
@customElement({
  name: 'ui-input',
  template: `<input
    id.bind="id"
    name.bind="name"
    type.bind="type"
    class.bind="classes"
    value.bind="value"
    placeholder.bind="placeholder"
    autocomplete.bind="autocomplete"
    disabled.bind="disabled"
    required.bind="required"
    aria-label.bind="ariaLabel || null"
    aria-invalid.bind="invalid ? 'true' : null"
    aria-describedby.bind="describedBy || null"
  />`,
})
export class UiInput {
  @bindable id = '';
  @bindable name = '';
  @bindable type: 'text' | 'email' | 'password' | 'search' | 'number' | 'url' | 'date' = 'text';
  @bindable value: string | number | null = '';
  @bindable placeholder = '';
  @bindable autocomplete = '';
  @bindable describedBy = '';
  @bindable disabled = false;
  @bindable required = false;
  @bindable invalid = false;
  /** Forwarded to the <input>; the host element is not focusable. */
  @bindable ariaLabel = '';

  get classes(): string {
    return cn(
      'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow]',
      'placeholder:text-muted-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium',
      'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40',
      'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
      'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
      'dark:bg-input/30',
    );
  }
}
