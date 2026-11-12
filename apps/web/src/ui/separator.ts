import { bindable, customElement } from 'aurelia';
import { cn } from '@/lib/utils';

@customElement({
  name: 'ui-separator',
  containerless: true,
  template: `<div role="separator" class.bind="classes"></div>`,
})
export class UiSeparator {
  @bindable orientation: 'horizontal' | 'vertical' = 'horizontal';

  get classes(): string {
    return cn(
      'shrink-0 bg-border',
      this.orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
    );
  }
}
