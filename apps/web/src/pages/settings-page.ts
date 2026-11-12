import { customElement, resolve } from 'aurelia';
import { IRouter } from '@aurelia/router';
import template from './settings-page.html';
import { ThemeService } from '@/services/theme';
import { I18nService, LOCALES } from '@/services/i18n';
import { api, ApiError, type CurrentWorkspace } from '@/services/api';
import { AuthService } from '@/services/auth';
import type { Locale } from '@aureliajs/shared';

@customElement({ name: 'settings-page', template })
export class SettingsPage {
  private readonly theme = resolve(ThemeService);
  readonly i18n = resolve(I18nService);
  private readonly auth = resolve(AuthService);
  private readonly router = resolve(IRouter);

  /** The workspace row, loaded from the API. */
  current: CurrentWorkspace | null = null;

  /** Editable copy of the fields. */
  workspace = { name: '', slug: '' };
  weeklyDigest = true;

  isLoading = true;
  saving = false;
  deleting = false;
  error = '';
  notice = '';

  readonly languages = LOCALES;

  /**
   * The translator, exposed through a view-model getter so the binding
   * re-evaluates when the locale changes.
   */
  get t() {
    this.i18n.track();
    return this.i18n.t;
  }

  /** The message catalog — see the note on `App.copy`. */
  get copy() {
    this.i18n.track();
    return this.i18n.strings;
  }

  get titleText(): string {
    this.i18n.track();
    return this.i18n.t('settings.title');
  }

  get themeLabel(): string {
    return this.theme.isDark ? 'Dark' : 'Light';
  }

  get canRename(): boolean {
    return this.current?.role === 'owner';
  }

  get canDelete(): boolean {
    return this.current?.role === 'owner';
  }

  async attached(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.isLoading = true;
    this.error = '';
    try {
      const current = await api.currentWorkspace();
      this.current = current;
      this.workspace = { name: current.name, slug: current.slug };
      this.weeklyDigest = current.settings.weeklyDigest;

      // The workspace owns the locale, so it wins over the browser guess.
      if (current.settings.locale !== this.i18n.locale) {
        this.i18n.setLocale(current.settings.locale);
      }
    } catch (cause) {
      this.error =
        cause instanceof ApiError ? cause.message : 'Could not load the workspace settings.';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Persist the workspace name, slug and preferences.
   *
   * The locale is written to the workspace as well as to localStorage, so a
   * teammate on the same workspace gets the same language.
   */
  async save(): Promise<void> {
    this.error = '';
    this.notice = '';

    const name = this.workspace.name.trim();
    const slug = this.workspace.slug.trim();

    if (name.length < 2) {
      this.error = this.i18n.t('settings.nameTooShort');
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      this.error = this.i18n.t('settings.slugInvalid');
      return;
    }

    this.saving = true;
    try {
      const updated = await api.updateWorkspace({
        name,
        slug,
        settings: { locale: this.i18n.locale, weeklyDigest: this.weeklyDigest },
      });

      this.current = updated;
      this.workspace = { name: updated.name, slug: updated.slug };
      this.weeklyDigest = updated.settings.weeklyDigest;

      // The sidebar shows the workspace name, so the shell has to catch up.
      await this.auth.refresh();

      this.notice = this.i18n.t('settings.saved');
    } catch (cause) {
      this.error =
        cause instanceof ApiError ? cause.message : 'Could not save the workspace settings.';
    } finally {
      this.saving = false;
    }
  }

  /**
   * Change the language.
   *
   * The UI switches immediately — waiting for the round trip would make the
   * control feel broken — and the choice is persisted straight away, so the
   * language follows the workspace rather than the browser that happens to
   * be open.
   */
  async onLocaleChange(locale: Locale): Promise<void> {
    this.error = '';
    this.i18n.setLocale(locale);

    try {
      const updated = await api.updateWorkspace({
        settings: { locale, weeklyDigest: this.weeklyDigest },
      });
      this.current = updated;
    } catch (cause) {
      this.error =
        cause instanceof ApiError ? cause.message : 'Could not save the language preference.';
    }
  }

  /**
   * Delete the workspace.
   *
   * The API refuses when a Stripe subscription is attached or when this is
   * the caller's only workspace; the message from the server is shown
   * verbatim so the reason is never hidden.
   */
  async deleteWorkspace(): Promise<void> {
    this.error = '';
    this.notice = '';

    const name = this.current?.name ?? '';
    if (!confirm(this.i18n.t('settings.deleteWorkspaceConfirm', { name }))) return;

    this.deleting = true;
    try {
      await api.deleteWorkspace();
      await this.auth.logout();
      await this.router.load('login');
    } catch (cause) {
      this.error = cause instanceof ApiError ? cause.message : 'Could not delete the workspace.';
    } finally {
      this.deleting = false;
    }
  }
}
