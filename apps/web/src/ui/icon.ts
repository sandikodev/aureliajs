import { bindable, customElement } from 'aurelia';
import { ICONS, type IconName } from '@/lib/icons';

@customElement({
  name: 'ui-icon',
  containerless: true,
  template: `<svg
    xmlns="http://www.w3.org/2000/svg"
    width.attr="size"
    height.attr="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width.attr="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="shrink-0"
    aria-hidden="true"
    innerhtml.bind="svg"
  ></svg>`,
})
export class UiIcon {
  @bindable name: IconName = 'check';
  @bindable size: number | string = 16;
  @bindable strokeWidth: number | string = 2;

  get svg(): string {
    return ICONS[this.name] ?? '';
  }
}
