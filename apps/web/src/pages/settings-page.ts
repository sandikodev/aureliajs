import { customElement, resolve, IEventAggregator } from 'aurelia';
import { IRouter } from '@aurelia/router';
import template from './settings-page.html';
import { ThemeService } from '@/services/theme';
import { I18nService, LOCALES } from '@/services/i18n';
import { api, ApiError, type CurrentWorkspace } from '@/services/api';
import { AuthService } from '@/services/auth';
import { ToastService } from '@/services/toast';
import type { Locale } from '@aurelia-ops/shared';

@customElement({ name: 'settings-page', template })
export class SettingsPage {
  readonly theme = resolve(ThemeService);
  readonly i18n = resolve(I18nService);
  private readonly auth = resolve(AuthService);
  private readonly router = resolve(IRouter);
  private readonly toast = resolve(ToastService);
  private readonly ea = resolve(IEventAggregator);

  /** The workspace row, loaded from the API. */
  current: CurrentWorkspace | null = null;

  /** Editable copy of the fields, seeded immediately from auth session. */
  workspace = {
    name: this.auth.workspace?.name ?? '',
    slug: this.auth.workspace?.slug ?? '',
  };
  weeklyDigest = true;

  isLoading = true;
  saving = false;
  deleting = false;

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

  toggleTheme(): void {
    this.theme.toggle();
  }

  get canRename(): boolean {
    return (this.current?.role ?? this.auth.role) === 'owner';
  }

  get canDelete(): boolean {
    return (this.current?.role ?? this.auth.role) === 'owner';
  }

  async attached(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.isLoading = true;
    try {
      if (this.auth.workspace) {
        this.workspace.name = this.auth.workspace.name;
        this.workspace.slug = this.auth.workspace.slug;
      }
      const current = await api.currentWorkspace();
      this.current = current;
      this.workspace = { name: current.name, slug: current.slug };
      this.weeklyDigest = current.settings.weeklyDigest;

      // The workspace owns the locale, so it wins over the browser guess.
      if (current.settings.locale !== this.i18n.locale) {
        this.i18n.setLocale(current.settings.locale);
      }
    } catch (cause) {
      if (this.auth.workspace) {
        this.workspace.name = this.auth.workspace.name;
        this.workspace.slug = this.auth.workspace.slug;
      }
      this.toast.error(
        cause instanceof ApiError ? cause.message : this.i18n.t('errors.loadWorkspaceFailed'),
      );
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Persist the workspace name and slug.
   * Scoped strictly to the Workspace card form.
   */
  async saveWorkspace(): Promise<void> {
    const name = this.workspace.name.trim();
    const slug = this.workspace.slug.trim();

    if (name.length < 2) {
      this.toast.error(this.i18n.t('settings.nameTooShort'));
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      this.toast.error(this.i18n.t('settings.slugInvalid'));
      return;
    }

    this.saving = true;
    try {
      const updated = await api.updateWorkspace({
        name,
        slug,
      });

      this.current = updated;
      this.workspace = { name: updated.name, slug: updated.slug };

      // Update auth and broadcast workspace update across entire SPA
      await this.auth.refresh();
      this.ea.publish('workspace:updated', updated);

      this.toast.success(this.i18n.t('settings.saved'));
    } catch (cause) {
      this.toast.error(
        cause instanceof ApiError ? cause.message : this.i18n.t('errors.saveWorkspaceFailed'),
      );
    } finally {
      this.saving = false;
    }
  }

  /** Backwards compatibility alias for saveWorkspace */
  async save(): Promise<void> {
    return this.saveWorkspace();
  }

  /**
   * Persist the weekly digest toggle immediately and independently.
   * Does NOT touch, re-validate, or trigger saving state on the Workspace form.
   */
  async onWeeklyDigestChange(): Promise<void> {
    try {
      const updated = await api.updateWorkspace({
        settings: { locale: this.i18n.locale, weeklyDigest: this.weeklyDigest },
      });
      this.current = updated;
      this.weeklyDigest = updated.settings.weeklyDigest;
      this.ea.publish('workspace:updated', updated);
      this.toast.success(this.i18n.t('settings.saved'));
    } catch (cause) {
      this.weeklyDigest = !this.weeklyDigest;
      this.toast.error(
        cause instanceof ApiError ? cause.message : this.i18n.t('errors.savePreferenceFailed'),
      );
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
    this.i18n.setLocale(locale);

    try {
      const updated = await api.updateWorkspace({
        settings: { locale, weeklyDigest: this.weeklyDigest },
      });
      this.current = updated;
      this.ea.publish('workspace:updated', updated);
    } catch (cause) {
      this.toast.error(
        cause instanceof ApiError ? cause.message : this.i18n.t('errors.saveLocaleFailed'),
      );
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
    const name = this.current?.name ?? '';
    if (!confirm(this.i18n.t('settings.deleteWorkspaceConfirm', { name }))) return;

    this.deleting = true;
    try {
      await api.deleteWorkspace();
      await this.auth.logout();
      await this.router.load('login');
    } catch (cause) {
      this.toast.error(
        cause instanceof ApiError ? cause.message : this.i18n.t('errors.deleteWorkspaceFailed'),
      );
    } finally {
      this.deleting = false;
    }
  }
}
