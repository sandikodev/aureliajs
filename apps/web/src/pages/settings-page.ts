import { customElement, resolve } from 'aurelia';
import template from './settings-page.html';
import { ThemeService } from '@/services/theme';

@customElement({ name: 'settings-page', template })
export class SettingsPage {
  private readonly theme = resolve(ThemeService);

  workspace = { name: 'Northwind Studio', slug: 'northwind' };
  language = 'en';
  weeklyDigest = true;
  notice = '';
  error = '';

  readonly languages = [
    { value: 'en', label: 'English' },
    { value: 'id', label: 'Bahasa Indonesia' },
  ];

  get themeLabel(): string {
    return this.theme.isDark ? 'Dark' : 'Light';
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  save(): void {
    this.error = '';
    if (this.workspace.name.trim().length < 2) {
      this.error = 'Workspace name needs at least 2 characters.';
      return;
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(this.workspace.slug)) {
      this.error = 'Slug can only contain lowercase letters, numbers and dashes.';
      return;
    }
    this.notice = 'Workspace settings saved (in memory for the demo).';
  }
}
