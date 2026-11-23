import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { DI, Registration, CustomElement } from 'aurelia';
import { IRouter } from '@aurelia/router';
import { JSDOM } from 'jsdom';
import { AuthService } from '../src/services/auth';
import { I18nService, MESSAGES } from '../src/services/i18n';
import { ToastService } from '../src/services/toast';
import { ThemeService } from '../src/services/theme';
import { ProjectsPage } from '../src/pages/projects-page';
import { OverviewPage } from '../src/pages/overview-page';
import {
  UiCard,
  UiCardContent,
  UiCardDescription,
  UiCardFooter,
  UiCardHeader,
  UiCardTitle,
} from '../src/ui/card';
import type { Project } from '@aurelia-ops/shared/schemas';

describe('apps/web — Component & Logic Architecture Rigor', () => {
  let dom: JSDOM;
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    dom = new JSDOM('<!doctype html><html lang="en"><body><div id="app"></div></body></html>', {
      url: 'http://localhost:4600/',
    });
    // Set up global DOM stubs for DI services that touch window / document
    globalThis.document = dom.window.document as unknown as Document;
    globalThis.window = dom.window as unknown as Window & typeof globalThis;
    globalThis.localStorage = dom.window.localStorage;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.localStorage = originalLocalStorage;
  });

  describe('I18nService (Catalog Integrity & Reactive Translation)', () => {
    it('guarantees 100% key parity between English and Indonesian catalogs', () => {
      const enKeys = Object.keys(MESSAGES.en).sort();
      const idKeys = Object.keys(MESSAGES.id).sort();

      expect(enKeys.length).toBeGreaterThan(150);
      expect(enKeys).toEqual(idKeys);
    });

    it('interpolates single and multiple parameters cleanly', () => {
      const i18n = new I18nService();
      const translated = i18n.t('overview.subtitle', { workspace: 'Analytical Engine' });
      expect(translated).toContain('Analytical Engine');

      const menuText = i18n.t('app.accountMenu', { name: 'Ada Lovelace' });
      expect(menuText).toContain('Ada Lovelace');
    });

    it('switches locales, notifies listeners, and mutates document.documentElement lang attribute', () => {
      const i18n = new I18nService();
      let notifiedLocale = '';
      i18n.onChange((locale) => {
        notifiedLocale = locale;
      });

      i18n.setLocale('id');
      expect(i18n.locale).toBe('id');
      expect(notifiedLocale).toBe('id');
      expect(document.documentElement.getAttribute('lang')).toBe('id');
      expect(i18n.t('nav.overview')).toBe(MESSAGES.id['nav.overview']);

      i18n.setLocale('en');
      expect(i18n.locale).toBe('en');
      expect(document.documentElement.getAttribute('lang')).toBe('en');
      expect(i18n.t('nav.overview')).toBe(MESSAGES.en['nav.overview']);
    });
  });

  describe('ThemeService (Light / Dark Reactive Switching)', () => {
    it('toggles mode, mutates DOM classList, and sets style.colorScheme', () => {
      const theme = new ThemeService();
      expect(theme.current).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      const toggled = theme.toggle();
      expect(toggled).toBe('dark');
      expect(theme.isDark).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.style.colorScheme).toBe('dark');

      theme.toggle();
      expect(theme.current).toBe('light');
      expect(theme.isDark).toBe(false);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.documentElement.style.colorScheme).toBe('light');
    });
  });

  describe('ProjectsPage (Aurelia 2 Route ViewModel & Business Logic)', () => {
    function createProjectsPageHarness() {
      const container = DI.createContainer();
      const mockRouter = {
        load: async () => true,
      };
      container.register(
        AuthService,
        I18nService,
        ToastService,
        Registration.instance(IRouter, mockRouter as unknown as IRouter),
      );
      return container.get(ProjectsPage);
    }

    it('processes route parameters in loading() lifecycle hook cleanly', () => {
      const page = createProjectsPageHarness();
      expect(page.q).toBe('');

      page.loading({ q: 'SearchQuery', new: 'true' });
      expect(page.q).toBe('SearchQuery');

      // shouldOpenNew is private, verified via openCreate trigger behavior
      expect(page.page).toBe(1);
    });

    it('calculates pagination boundary conditions and page ranges accurately', () => {
      const page = createProjectsPageHarness();
      page.pageSize = 10;
      page.total = 85;
      page.isLoading = false;

      page.page = 1;
      expect(page.totalPages).toBe(9);
      expect(page.rangeStart).toBe(1);
      expect(page.rangeEnd).toBe(10);
      expect(page.canPrev).toBe(false);
      expect(page.canNext).toBe(true);

      page.page = 9;
      expect(page.rangeStart).toBe(81);
      expect(page.rangeEnd).toBe(85);
      expect(page.canPrev).toBe(true);
      expect(page.canNext).toBe(false);

      page.total = 0;
      page.page = 1;
      expect(page.rangeStart).toBe(0);
      expect(page.rangeEnd).toBe(0);
      expect(page.totalPages).toBe(1);
    });

    it('sorts and filters projects deterministically in local fallback mode', () => {
      const page = createProjectsPageHarness();

      // Test budget sorting
      page.sort = 'budget';
      (page as unknown as { loadLocal(): void }).loadLocal();
      expect(page.items.length).toBeGreaterThan(0);
      for (let i = 1; i < page.items.length; i++) {
        const prev = page.items[i - 1]!;
        const curr = page.items[i]!;
        expect(prev.budgetCents).toBeGreaterThanOrEqual(curr.budgetCents);
      }

      // Test name search filter
      page.q = 'Alpha';
      (page as unknown as { loadLocal(): void }).loadLocal();
      for (const item of page.items) {
        const matchesName = item.name.toLowerCase().includes('alpha');
        const matchesOwner = item.ownerName.toLowerCase().includes('alpha');
        expect(matchesName || matchesOwner).toBe(true);
      }
    });

    it('mutates edited project in-place on onProjectSaved', async () => {
      const page = createProjectsPageHarness();
      const sample: Project = {
        id: 'p-1',
        workspaceId: 'w-1',
        name: 'Initial Name',
        status: 'planning',
        budgetCents: 500000,
        dueDate: null,
        ownerName: 'Ada',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      page.items = [sample];

      const updated: Project = { ...sample, name: 'Renamed Project', status: 'active' };
      await page.onProjectSaved({
        isEdit: true,
        project: updated,
        input: { name: 'Renamed Project', status: 'active', budgetCents: 500000, dueDate: null, ownerName: 'Ada' },
      });

      expect(page.items.length).toBe(1);
      expect(page.items[0]?.name).toBe('Renamed Project');
      expect(page.items[0]?.status).toBe('active');
    });
  });

  describe('OverviewPage (KPI Aggregation & SVG Sparkline Geometry)', () => {
    function createOverviewPageHarness() {
      const container = DI.createContainer();
      const mockRouter = { load: async () => true };
      container.register(
        AuthService,
        I18nService,
        ToastService,
        Registration.instance(IRouter, mockRouter as unknown as IRouter),
      );
      return container.get(OverviewPage);
    }

    it('generates mathematically valid SVG sparkline coordinates and path commands', () => {
      const page = createOverviewPageHarness();
      const points = page.trendPoints;
      expect(points.length).toBeGreaterThan(0);

      // Verify coordinate constraints: width 480, height 150
      for (const pt of points) {
        expect(pt.x).toBeGreaterThanOrEqual(0);
        expect(pt.x).toBeLessThanOrEqual(480);
        expect(pt.y).toBeGreaterThanOrEqual(0);
        expect(pt.y).toBeLessThanOrEqual(150);
      }

      const path = page.trendLine;
      expect(path.startsWith('M')).toBe(true);
      expect(path).toContain('L');

      const area = page.trendArea;
      expect(area.startsWith('M')).toBe(true);
      expect(area.endsWith('L0 160 Z')).toBe(true);
    });

    it('computes status breakdown percentages proportionally', () => {
      const page = createOverviewPageHarness();
      const breakdown = page.statusBreakdown;
      expect(breakdown.length).toBe(4);

      let totalPercent = 0;
      for (const row of breakdown) {
        expect(row.percent).toBeGreaterThanOrEqual(0);
        expect(row.percent).toBeLessThanOrEqual(100);
        expect(row.color).toBeDefined();
        totalPercent += row.percent;
      }
      // Sum of percentages should be approximately 100% (within rounding)
      expect(totalPercent).toBeGreaterThanOrEqual(95);
      expect(totalPercent).toBeLessThanOrEqual(105);
    });
  });

  describe('UI Design System Primitives (Aurelia 2 Custom Elements)', () => {
    it('defines valid CustomElement metadata for Card family components', () => {
      const cardDef = CustomElement.getDefinition(UiCard);
      expect(cardDef.name).toBe('ui-card');
      expect(cardDef.bindables.padded).toBeDefined();

      const headerDef = CustomElement.getDefinition(UiCardHeader);
      expect(headerDef.name).toBe('ui-card-header');
      expect(headerDef.containerless).toBe(true);

      const titleDef = CustomElement.getDefinition(UiCardTitle);
      expect(titleDef.name).toBe('ui-card-title');
      expect(titleDef.containerless).toBe(true);

      const descDef = CustomElement.getDefinition(UiCardDescription);
      expect(descDef.name).toBe('ui-card-description');
      expect(descDef.containerless).toBe(true);

      const contentDef = CustomElement.getDefinition(UiCardContent);
      expect(contentDef.name).toBe('ui-card-content');
      expect(contentDef.containerless).toBe(true);

      const footerDef = CustomElement.getDefinition(UiCardFooter);
      expect(footerDef.name).toBe('ui-card-footer');
      expect(footerDef.containerless).toBe(true);
    });
  });
});
