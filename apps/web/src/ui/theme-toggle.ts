import { customElement, resolve } from 'aurelia';
import { ThemeService } from '@/services/theme';

@customElement({
  name: 'ui-theme-toggle',
  containerless: true,
  template: `<button
    type="button"
    class="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    click.trigger="toggle()"
    aria-label.bind="label"
    title.bind="label"
  >
    <ui-icon name.bind="isDark ? 'sun' : 'moon'" size="18"></ui-icon>
  </button>`,
})
export class UiThemeToggle {
  private readonly theme = resolve(ThemeService);
  isDark = this.theme.isDark;

  get label(): string {
    return this.isDark ? 'Switch to light theme' : 'Switch to dark theme';
  }

  toggle(): void {
    this.isDark = this.theme.toggle() === 'dark';
  }
}
