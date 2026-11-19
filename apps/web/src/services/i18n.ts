import type { Locale } from '@aurelia-ops/shared';
import { observable } from 'aurelia';
import { EN } from '../locales/en';
import { ID } from '../locales/id';

/**
 * The message catalog.
 *
 * `en` is the source of truth and its keys define the type; every other
 * locale must provide all of them, so a missing translation is a type error
 * rather than a `[missing key]` in the UI.
 */
export const MESSAGES = {
  en: EN,
  id: ID,
} as const;

export type MessageKey = keyof typeof EN;

export const LOCALES: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'id', label: 'Bahasa Indonesia' },
];

export const LOCALE_STORAGE_KEY = 'aurelia-locale';

/** Interpolate `{name}` placeholders. */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value === undefined ? match : String(value);
  });
}

/**
 * A tiny translation service.
 *
 * Aurelia's own `@aurelia/i18n` is still a preview package; this keeps the
 * same idea (one catalog, one lookup, a persisted locale) without pulling a
 * preview dependency into the bundle. The API surface is deliberately the
 * same shape, so swapping it later is a one-file change.
 */
export class I18nService {
  /**
   * Observable on purpose.
   *
   * The `t` getter below reads it, and Aurelia tracks property access inside
   * a computed getter — so a template binding of `i18n.t('some.key')`
   * re-evaluates by itself when the locale changes. Without the observable
   * decorator the language switch would only change the text after a full
   * page reload.
   */
  @observable locale: Locale = 'en';

  /** Called whenever the locale changes, so subscribers can re-render. */
  private readonly listeners = new Set<(locale: Locale) => void>();

  constructor() {
    this.locale = this.detect();
    document.documentElement.setAttribute('lang', this.locale);
  }

  /** The persisted choice wins; otherwise fall back to the browser language. */
  private detect(): Locale {
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored === 'en' || stored === 'id') return stored;
    } catch {
      // Private mode can make localStorage throw.
    }

    const browser = navigator.language?.toLowerCase() ?? '';
    return browser.startsWith('id') ? 'id' : 'en';
  }

  setLocale(locale: Locale): void {
    if (locale === this.locale) return;

    this.locale = locale;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Ignore — the locale still applies for this session.
    }

    // Keep the document language in sync; screen readers use it to pick a
    // pronunciation, and the browser uses it for `lang`-aware hyphenation.
    document.documentElement.setAttribute('lang', locale);

    for (const listener of this.listeners) listener(locale);
  }

  onChange(listener: (locale: Locale) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * The current message catalog.
   *
   * Templates read it as `copy['some.key']`, where `copy` is a view-model
   * getter. That shape matters: Aurelia re-evaluates a binding when a
   * getter it depends on is invalidated, but it does **not** re-evaluate
   * when the binding calls a function returned by a getter — the call
   * expression hides the dependency.
   */
  get strings(): Record<MessageKey, string> {
    return MESSAGES[this.locale] as Record<MessageKey, string>;
  }

  /**
   * The translator: `i18n.t('projects.title')`.
   *
   * `locale` is `@observable`. Reading it inside an observed view-model
   * getter registers the binding as a dependency of the locale, which is
   * what makes the UI switch language without a reload.
   *
   * Note that Aurelia observes getters on a *view model* but not on an
   * injected service, so components expose their own `get t()` rather than
   * calling this service straight from a template.
   */
  get t(): (key: MessageKey, params?: Record<string, string | number>) => string {
    const locale = this.locale;
    const catalog = MESSAGES[locale] as Partial<Record<MessageKey, string>>;

    return (key, params) => {
      const template = catalog[key] ?? EN[key] ?? key;
      return interpolate(template, params);
    };
  }

  /**
   * Read the current locale.
   *
   * Components call this from their own `get t()` so that the locale is read
   * *inside the view model's observed getter*. Reading it here — a plain
   * method call from the service — would not register the dependency,
   * because Aurelia does not track property access that happens inside a
   * function call.
   */
  track(): Locale {
    return this.locale;
  }
}
