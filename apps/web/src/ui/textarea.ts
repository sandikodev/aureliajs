import { bindable, customElement } from 'aurelia';

@customElement({
  name: 'ui-textarea',
  containerless: true,
  template: `<textarea
    id.bind="id"
    name.bind="name"
    rows.bind="rows"
    class="min-h-20 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50 dark:bg-input/30"
    value.bind="value"
    placeholder.bind="placeholder"
  ></textarea>`,
})
export class UiTextarea {
  @bindable id = '';
  @bindable name = '';
  @bindable rows = 3;
  @bindable value = '';
  @bindable placeholder = '';
}
