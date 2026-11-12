import { bindable, customElement } from 'aurelia';
import { cn, initials } from '@/lib/utils';

@customElement({
  name: 'ui-avatar',
  containerless: true,
  template: `<span class.bind="classes" aria-hidden="true">\${initials}</span>`,
})
export class UiAvatar {
  @bindable name = '';
  @bindable size: 'sm' | 'default' | 'lg' = 'default';

  get initials(): string {
    return initials(this.name);
  }

  get classes(): string {
    return cn(
      'inline-flex shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground ring-1 ring-border select-none',
      this.size === 'sm' && 'size-6 text-[10px]',
      this.size === 'default' && 'size-8 text-xs',
      this.size === 'lg' && 'size-10 text-sm',
    );
  }
}
