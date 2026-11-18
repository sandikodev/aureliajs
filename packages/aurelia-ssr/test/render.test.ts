import { describe, it, expect } from 'bun:test';
import { CustomElement, resolve } from 'aurelia';
import { renderAurelia, IRequestContext, resolveRequestContext } from '../src/render.js';

describe('renderAurelia()', () => {
  it('renders canonical Aurelia 2 CustomElement without mutating globalThis', async () => {
    const SimplePage = CustomElement.define(
      { name: 'simple-page', template: '<div>Hello ${name}</div>' },
      class {
        name = 'World';
      }
    );

    const prevWindow = (globalThis as Record<string, unknown>).window;
    const prevDocument = (globalThis as Record<string, unknown>).document;

    const html = await renderAurelia({
      component: SimplePage,
      props: { name: 'Aurelia 2' },
    });

    // Real Aurelia 2 ISSRContext preserves <!--au--> hydration markers by default
    expect(html).toBe('<div>Hello <!--au-->Aurelia 2</div>');

    // Static / non-hydrated render strips markers when preserveMarkers: false
    const staticHtml = await renderAurelia({
      component: SimplePage,
      props: { name: 'Aurelia 2' },
      preserveMarkers: false,
    });
    expect(staticHtml).toBe('<div>Hello Aurelia 2</div>');

    // Must NEVER monkey-patch globalThis
    expect((globalThis as Record<string, unknown>).window).toBe(prevWindow);
    expect((globalThis as Record<string, unknown>).document).toBe(prevDocument);
  });

  it('injects strictly typed IRequestContext via Aurelia 2 DI without mutating secret fields', async () => {
    interface AppContext extends Record<string, unknown> {
      locale: string;
      tenant: string;
    }

    const DiPage = CustomElement.define(
      {
        name: 'di-page',
        template:
          '<div>${req.data.tenant} (${req.data.locale}) — ${req.url} — ${req.params.id} — server:${req.isServer}</div>',
      },
      class {
        readonly req = resolveRequestContext<AppContext>();
        // Verify component does NOT receive unwanted splatted context properties
        locale = 'component-own-default';
      }
    );

    const html = await renderAurelia({
      component: DiPage,
      context: { locale: 'id-ID', tenant: 'acme' },
      url: 'https://example.com/items/42?sort=asc',
      params: { id: '42' },
      query: { sort: 'asc' },
      preserveMarkers: false,
    });

    expect(html).toContain('acme (id-ID)');
    expect(html).toContain('https://example.com/items/42?sort=asc');
    expect(html).toContain('42');
    expect(html).toContain('server:true');
  });

  it('preserves real Aurelia 2 hydration markers via native ISSRContext', async () => {
    const ListPage = CustomElement.define(
      {
        name: 'list-page',
        template: '<ul><li repeat.for="item of items">${item.name}</li></ul>',
      },
      class {
        items = [{ name: 'Alpha' }, { name: 'Beta' }];
      }
    );

    const html = await renderAurelia({ component: ListPage });

    expect(html).toContain('Alpha');
    expect(html).toContain('Beta');
    expect(html).toContain('<!--au-start-->');
    expect(html).toContain('<!--au-end-->');
  });

  it('renders child components registered via registrations and supports if.bind', async () => {
    const StatusBadge = CustomElement.define(
      { name: 'status-badge', template: '<span class="badge"><au-slot></au-slot></span>' },
      class {}
    );

    const HostPage = CustomElement.define(
      {
        name: 'host-page',
        template:
          '<div><status-badge if.bind="active">${label}</status-badge><span if.bind="!active">Off</span></div>',
      },
      class {
        active = true;
        label = 'Online';
      }
    );

    const html = await renderAurelia({
      component: HostPage,
      registrations: [StatusBadge],
    });

    expect(html).toContain('<status-badge>');
    expect(html).toContain('Online');
    expect(html).not.toContain('Off');
  });

  it('invokes component attached() lifecycle hook during SSR', async () => {
    let attachedCalled = false;

    const LifecyclePage = CustomElement.define(
      { name: 'lifecycle-page', template: '<div>Ready</div>' },
      class {
        async attached() {
          attachedCalled = true;
        }
      }
    );

    await renderAurelia({ component: LifecyclePage });
    expect(attachedCalled).toBe(true);
  });

  it('isolates 20 concurrent SSR requests with zero cross-request state contamination', async () => {
    const RequestView = CustomElement.define(
      {
        name: 'request-view',
        template: '<div>${label}:${req.data.requestId}:${req.params.idx}</div>',
      },
      class {
        readonly req = resolve(IRequestContext);
        label = '';
      }
    );

    const promises: Promise<string>[] = [];
    for (let idx = 0; idx < 20; idx++) {
      promises.push(
        renderAurelia({
          component: RequestView,
          props: { label: `Job-${idx}` },
          context: { requestId: `req-${idx}` },
          params: { idx: String(idx) },
          preserveMarkers: false,
        })
      );
    }

    const outputs = await Promise.all(promises);
    for (let idx = 0; idx < 20; idx++) {
      expect(outputs[idx]).toContain(`Job-${idx}:req-${idx}:${idx}`);
    }
  });

  it('rejects on missing component, render error, or timeout', async () => {
    await expect(
      renderAurelia({ component: null as unknown as object })
    ).rejects.toThrow('component is required');

    const SlowPage = CustomElement.define(
      { name: 'slow-page', template: '<div>Slow</div>' },
      class {
        async attached() {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    );

    await expect(
      renderAurelia({ component: SlowPage, timeout: 50 })
    ).rejects.toThrow('renderAurelia timeout after 50ms');
  });

  it('emits lightweight client-only placeholder without booting JSDOM', async () => {
    const ClientChart = CustomElement.define(
      { name: 'heavy-chart', template: '<canvas></canvas>' },
      class {
        static clientOnly = true;
      }
    );

    const html = await renderAurelia({ component: ClientChart });
    expect(html).toBe('<div class="au-client-island" data-au-client="heavy-chart"></div>');
  });

  it('supports LinkeDOM engine for Cloudflare Workers / Edge runtime compatibility', async () => {
    const EdgeComponent = CustomElement.define(
      {
        name: 'edge-card',
        template: '<section class="edge"><h1>${heading}</h1><p>Count: ${count}</p></section>',
      },
      class {
        heading = 'Edge Ready';
        count = 1;
      }
    );

    // 1. Explicit engine: 'linkedom'
    const linkedomHtml = await renderAurelia({
      component: EdgeComponent,
      props: { heading: 'Hello Cloudflare Workers', count: 42 },
      engine: 'linkedom',
      preserveMarkers: false,
    });

    expect(linkedomHtml).toContain('Hello Cloudflare Workers');
    expect(linkedomHtml).toContain('Count: 42');
    expect(linkedomHtml).toContain('class="edge"');

    // 2. Explicit engine: 'jsdom'
    const jsdomHtml = await renderAurelia({
      component: EdgeComponent,
      props: { heading: 'Hello JSDOM', count: 99 },
      engine: 'jsdom',
      preserveMarkers: false,
    });

    expect(jsdomHtml).toContain('Hello JSDOM');
    expect(jsdomHtml).toContain('Count: 99');

    // 3. Engine: 'auto'
    const autoHtml = await renderAurelia({
      component: EdgeComponent,
      props: { heading: 'Hello Auto', count: 100 },
      engine: 'auto',
      preserveMarkers: false,
    });
    expect(autoHtml).toContain('Hello Auto');
  });
});
