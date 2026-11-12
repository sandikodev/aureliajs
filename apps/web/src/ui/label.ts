import { bindable, customElement } from 'aurelia';

@customElement({
  name: 'ui-label',
  containerless: true,
  template: `<label
    for.bind="for"
    class="flex items-center gap-2 text-sm leading-none font-medium select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
  ><au-slot></au-slot></label>`,
})
export class UiLabel {
  @bindable for = '';
}
