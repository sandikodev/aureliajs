import { describe, expect, it, beforeEach, afterEach, spyOn } from 'bun:test';
import { DI, Registration, CustomElement } from 'aurelia';
import { IRouter, IRouterEvents } from '@aurelia/router';
import { JSDOM } from 'jsdom';
import { App } from '../src/app';
import { AuthService } from '../src/services/auth';
import { I18nService, MESSAGES } from '../src/services/i18n';
import { ToastService } from '../src/services/toast';
import { ThemeService } from '../src/services/theme';
import { ProjectsPage } from '../src/pages/projects-page';
import { OverviewPage } from '../src/pages/overview-page';
import { MembersPage } from '../src/pages/members-page';
import { SettingsPage } from '../src/pages/settings-page';
import { api, type ProjectQuery } from '../src/services/api';
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
      expect((page as any).shouldOpenNew).toBe(true);

      expect(page.page).toBe(1);
    });

    it('triggers openCreate when attached with new=true in query or router instruction', async () => {
      const page = createProjectsPageHarness();
      let createCalled = false;
      page.dialog = {
        dialogEl: { showModal: () => {}, close: () => {}, open: false } as any,
        openCreate: () => {
          createCalled = true;
        },
      } as any;

      dom.reconfigure({ url: 'http://localhost:4600/projects?new=true' });
      await page.attached();
      expect(createCalled).toBe(true);
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

    it('delegates sorting and filtering to the API and renders its response', async () => {
      const page = createProjectsPageHarness();
      const rows: Project[] = [
        {
          id: 'p-1',
          workspaceId: 'w-1',
          name: 'Alpha Project',
          status: 'active',
          budgetCents: 900000,
          dueDate: null,
          ownerName: 'Ada',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'p-2',
          workspaceId: 'w-1',
          name: 'Beta Project',
          status: 'planning',
          budgetCents: 400000,
          dueDate: null,
          ownerName: 'Grace',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      const calls: ProjectQuery[] = [];
      const spy = spyOn(api, 'listProjects').mockImplementation(async (query) => {
        calls.push({ ...query });
        return { items: rows, page: 1, pageSize: 10, total: rows.length };
      });

      try {
        // Budget sort is passed to the server, not applied to a local dataset.
        page.sort = 'budget';
        await page.load();
        expect(calls[0]?.sort).toBe('budget');
        expect(page.items.length).toBe(2);

        // Search text is forwarded verbatim as the API query.
        page.q = 'Alpha';
        await page.load();
        expect(calls[1]?.q).toBe('Alpha');
        expect(page.items.length).toBe(2);
      } finally {
        spy.mockRestore();
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
        input: {
          name: 'Renamed Project',
          status: 'active',
          budgetCents: 500000,
          dueDate: null,
          ownerName: 'Ada',
        },
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
      page.overview = {
        ...page.overview,
        trend: [
          { month: 'Jan', value: 2 },
          { month: 'Feb', value: 5 },
          { month: 'Mar', value: 3 },
          { month: 'Apr', value: 8 },
        ],
      };
      const points = page.trendPoints;
      expect(points.length).toBe(4);

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
      page.overview = {
        ...page.overview,
        stats: {
          ...page.overview.stats,
          total: 10,
          active: 5,
          planning: 3,
          paused: 2,
          done: 0,
        },
      };
      const breakdown = page.statusBreakdown;
      expect(breakdown.length).toBe(4);
      expect(breakdown.find((row) => row.key === 'active')?.percent).toBe(50);

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

  describe('MembersPage (Aurelia 2 Route ViewModel & Business Logic)', () => {
    function createMembersPageHarness() {
      const container = DI.createContainer();
      container.register(AuthService, I18nService, ToastService);
      return container.get(MembersPage);
    }

    it('calculates seats, roles, and relative joined dates accurately', () => {
      const page = createMembersPageHarness();
      const mockMember = {
        id: 'm1',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        role: 'owner' as const,
        joinedAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
      };
      // Membership data is API-driven; inject a loaded state directly.
      page.members = [mockMember];
      page.seatUsed = 1;
      page.seatLimit = 5;

      expect(page.members.length).toBeGreaterThan(0);
      expect(page.roleLabel('owner')).toBeDefined();
      expect(page.roleVariant('owner')).toBe('default');
      expect(page.roleVariant('admin')).toBe('secondary');
      expect(page.roleVariant('member')).toBe('outline');

      expect(page.joined(mockMember)).toBe('joined 5 days ago');
      expect(page.seatsPercent).toBe(20);
      expect(page.seatsPercent).toBeGreaterThanOrEqual(0);
      expect(page.seatsPercent).toBeLessThanOrEqual(100);

      // Verify reactive localization in Indonesian
      page.i18n.setLocale('id');
      expect(page.joined(mockMember)).toBe('bergabung 5 hari lalu');
      expect(page.roleOptions).toEqual([
        { value: 'member', label: 'Anggota' },
        { value: 'admin', label: 'Admin' },
        { value: 'owner', label: 'Pemilik' },
      ]);
    });

    it('optimistically mutates member role in-place without reload', async () => {
      const page = createMembersPageHarness();
      const member = {
        id: 'm-opt',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        role: 'member' as const,
        joinedAt: new Date().toISOString(),
      };
      page.members = [member];

      // Trigger changeRole
      void page.changeRole(member, 'admin');

      // Optimistic mutation MUST be instant in-place
      expect(page.members[0].role).toBe('admin');
    });
  });

  describe('App Shell Layout State Machine (Prevent Half-Rendered Glitches)', () => {
    function createAppHarness(path = '/overview') {
      dom.reconfigure({ url: `http://localhost:4600${path}` });
      const container = DI.createContainer();
      const mockRouter = {
        load: async () => true,
      };
      const mockEvents = {
        subscribe: () => ({ dispose: () => {} }),
      };
      container.register(
        AuthService,
        I18nService,
        ToastService,
        ThemeService,
        Registration.instance(IRouter, mockRouter as unknown as IRouter),
        Registration.instance(IRouterEvents, mockEvents as unknown as IRouterEvents),
      );
      return container.get(App);
    }

    it('updates auth.workspace and syncs workspaces on workspace:updated event', async () => {
      const app = createAppHarness('/overview');
      await app.attached();
      app.auth.workspace = {
        id: 'ws-1',
        name: 'Initial Name',
        slug: 'initial-name',
        plan: 'free',
        trialEndsAt: null,
      };

      const ea = (app as any).ea;
      ea.publish('workspace:updated', {
        id: 'ws-1',
        name: 'Northwind fdgf',
        slug: 'hfgdh',
        plan: 'free',
        role: 'owner',
        settings: { locale: 'id', weeklyDigest: true },
      });

      expect(app.auth.workspace?.name).toBe('Northwind fdgf');
      expect(app.auth.workspace?.slug).toBe('hfgdh');
    });

    it('updates document title reactively on navigation and locale changes', async () => {
      const app = createAppHarness('/members');
      await app.attached();

      // On /members with EN locale
      (app as any).updateDocumentTitle();
      expect(document.title).toBe('Members · Aurelia Ops');

      // Switch to ID locale
      app.i18n.setLocale('id');
      expect(document.title).toBe('Anggota · Aurelia Ops');
    });

    it('always enables shell for protected dashboard routes (even without prior login)', () => {
      const appBilling = createAppHarness('/billing');
      expect(appBilling.showShell).toBe(true);

      const appProjects = createAppHarness('/projects');
      expect(appProjects.showShell).toBe(true);

      const appMembers = createAppHarness('/members');
      expect(appMembers.showShell).toBe(true);
    });

    it('disables shell for standalone public routes', () => {
      const appLanding = createAppHarness('/');
      expect(appLanding.showShell).toBe(false);

      const appLogin = createAppHarness('/login');
      expect(appLogin.showShell).toBe(false);

      const appInvite = createAppHarness('/invite');
      expect(appInvite.showShell).toBe(false);
    });

    it('transitions shell immediately when navigating from login to overview on navigation-start', async () => {
      const callbacks: Record<string, (event: unknown) => void> = {};
      const mockEvents = {
        subscribe: (name: string, cb: (event: unknown) => void) => {
          callbacks[name] = cb;
          return { dispose: () => {} };
        },
      };

      dom.reconfigure({ url: 'http://localhost:4600/login' });
      const container = DI.createContainer();
      container.register(
        AuthService,
        I18nService,
        ToastService,
        ThemeService,
        Registration.instance(IRouter, { load: async () => true } as unknown as IRouter),
        Registration.instance(IRouterEvents, mockEvents as unknown as IRouterEvents),
      );
      const app = container.get(App);
      await app.attached();

      // On /login initially:
      expect(app.showShell).toBe(false);

      // Simulate router navigation-start event towards overview (user clicked login)
      const mockStartEvent = {
        instructions: {
          toPath: () => 'overview',
        },
      };
      callbacks['au:router:navigation-start']?.(mockStartEvent);

      // Shell MUST be enabled immediately at navigation start — before viewport finishes!
      expect(app.showShell).toBe(true);
    });

    it('strips query parameters when evaluating route path', () => {
      const appQuery = createAppHarness('/billing?period=last-30');
      expect(appQuery.showShell).toBe(true);

      const appLoginQuery = createAppHarness('/login?returnUrl=%2Fbilling');
      expect(appLoginQuery.showShell).toBe(false);
    });
  });

  describe('SettingsPage (Independent Submissions & Preferences UX Isolation)', () => {
    function createSettingsHarness() {
      const container = DI.createContainer();
      container.register(
        AuthService,
        I18nService,
        ToastService,
        ThemeService,
        Registration.instance(IRouter, { load: async () => true } as unknown as IRouter),
      );
      return container.get(SettingsPage);
    }

    it('keeps workspace saving state false when weeklyDigest toggle is triggered', async () => {
      const page = createSettingsHarness();
      page.workspace = { name: 'Northwind Detail', slug: 'northwind' };
      page.weeklyDigest = true;

      expect(page.saving).toBe(false);

      // Simulate toggling checkbox in preferences card
      page.weeklyDigest = false;
      // Trigger independent handler
      const promise = page.onWeeklyDigestChange();

      // Workspace saving button loading state MUST remain false!
      expect(page.saving).toBe(false);

      await promise;
      expect(page.saving).toBe(false);
    });

    it('validates workspace name and slug strictly inside saveWorkspace without preference interference', async () => {
      const page = createSettingsHarness();
      page.workspace = { name: 'A', slug: 'invalid slug with spaces!' };

      // Should fail validation early without setting saving=true permanently
      await page.saveWorkspace();
      expect(page.saving).toBe(false);
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
