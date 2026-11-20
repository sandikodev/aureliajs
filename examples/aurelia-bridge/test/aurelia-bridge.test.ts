import { describe, it, expect, afterAll } from 'bun:test';
import { DI } from 'aurelia';
import { BridgeConfiguration, IBridgeRegistry } from '@aureliajs/bridge';
import { IEnterpriseOrderService } from '../src/services/enterprise-order.service';
import { MyApp } from '../src/my-app';

// Restore native Bun Error.prepareStackTrace if Babel's stackTraceRewriter was installed during JSX transpilation
if (typeof Error.prepareStackTrace === 'function' && Error.prepareStackTrace.name === 'stackTraceRewriter') {
  delete (Error as { prepareStackTrace?: unknown }).prepareStackTrace;
}

describe('examples/aurelia-bridge integration tests', () => {
  it('registers BridgeConfiguration and AuBridge in Aurelia DI container', () => {
    const container = DI.createContainer();
    container.register(BridgeConfiguration);

    const registry = container.get(IBridgeRegistry);
    expect(registry).toBeDefined();
    expect(registry.get('react')).toBeDefined();
    expect(registry.get('vue')).toBeDefined();
    expect(registry.get('svelte')).toBeDefined();
    expect(registry.get('solid')).toBeDefined();
    expect(registry.get('preact')).toBeDefined();
    expect(registry.get('qwik')).toBeDefined();
  });

  it('manages enterprise orders via IoC service without glue code', () => {
    const container = DI.createContainer();
    const service = container.get(IEnterpriseOrderService);

    expect(service.getOrders().length).toBe(3);
    const initialBudget = service.calculateTotalBudget();
    expect(initialBudget).toBeGreaterThan(0);

    const newOrder = service.addOrder('Cloud Migration Gateway', 'Platform Team', 15000);
    expect(service.getOrders().length).toBe(4);
    expect(newOrder.approved).toBe(false);

    service.toggleApproval(newOrder.id);
    expect(service.calculateTotalBudget()).toBe(initialBudget + 15000);

    service.removeOrder(newOrder.id);
    expect(service.getOrders().length).toBe(3);
  });

  it('instantiates MyApp and exposes multi-framework convention components', () => {
    const container = DI.createContainer();
    container.register(BridgeConfiguration);

    const app = container.get(MyApp);
    expect(app.sharedCounter).toBe(42);
    expect(app.ReactCounter).toBeDefined();
    expect(app.VueCounter).toBeDefined();
    expect(app.SvelteCounter).toBeDefined();
    expect(app.SolidCounter).toBeDefined();
    expect(app.PreactCounter).toBeDefined();
    expect(app.QwikCounter).toBeDefined();

    // Verify counter sync update handler
    app.handleCounterUpdate(99, 'React 19');
    expect(app.sharedCounter).toBe(99);
    expect(app.auditTrail.length).toBeGreaterThan(0);
    expect(app.auditTrail[0]?.source).toBe('React 19');
    expect(app.auditTrail[0]?.newValue).toBe(99);

    // Verify Aurelia host-level broadcast surge & reset
    app.broadcastSurge(10);
    expect(app.sharedCounter).toBe(109);
    expect(app.auditTrail[0]?.newValue).toBe(109);

    app.broadcastReset();
    expect(app.sharedCounter).toBe(0);
    expect(app.auditTrail[0]?.newValue).toBe(0);

    // Verify host pulse invocation without error
    expect(() => app.triggerHostPulse()).not.toThrow();

    // Verify floating console dock toggle & clear
    expect(app.isConsoleExpanded).toBe(false);
    app.toggleConsole();
    expect(app.isConsoleExpanded).toBe(true);
    app.toggleConsole();
    expect(app.isConsoleExpanded).toBe(false);

    expect(app.auditTrail.length).toBeGreaterThan(0);
    app.clearAuditTrail();
    expect(app.auditTrail.length).toBe(0);
  });

  it('dispatches Qwik inlined QRL click events via Qwikloader delegation to update state', async () => {
    const { JSDOM } = await import('jsdom');
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="container"></div></body></html>');
    const win = dom.window as unknown as typeof globalThis;
    const doc = dom.window.document;

    const prevWin = globalThis.window;
    const prevDoc = globalThis.document;
    const prevCustomEvent = globalThis.CustomEvent;
    (globalThis as any).window = win;
    (globalThis as any).document = doc;
    (globalThis as any).CustomEvent = dom.window.CustomEvent;
    (globalThis as any).qRuntimeQrl = true;

    try {
      const qwik = await import('@builder.io/qwik');
      const { component$, useSignal, $, jsx } = qwik;
      const { createQwikAdapter } = await import('@aureliajs/bridge');

      let receivedValue: number | null = null;
      let clickCount = 0;
      const container = doc.getElementById('container')!;

      const TestQwikCounter = component$((props: any) => {
        const localClicks = useSignal(0);
        return jsx('div', {
          class: 'framework-card qwik-card',
          children: [
            jsx('button', {
              class: 'btn-framework btn-qwik qwik-inc-btn',
              onClick$: $(() => {
                localClicks.value++;
                clickCount = localClicks.value;
                const next = (props.value ?? 0) + 1;
                (props.onChange$ ?? props.onChange)?.(next);
              }),
              children: '+1 Shared'
            })
          ]
        });
      });

      const adapter = createQwikAdapter(qwik as any);
      const instance = await adapter.mount({
        container,
        component: TestQwikCounter,
        props: {
          value: 42,
        },
        onEvent: (event: string, payload?: unknown) => {
          if (event === 'change') {
            receivedValue = payload as number;
          }
        },
      });

      // Find the +1 Shared button
      const incBtn = container.querySelector('.qwik-inc-btn') as HTMLButtonElement | null;
      expect(incBtn).not.toBeNull();

      // Dispatch native click event
      incBtn!.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));

      // Wait microtasks for Qwik signal & QRL dispatch
      await new Promise((r) => setTimeout(r, 50));

      expect(clickCount).toBe(1);
      // Value should have incremented from 42 to 43 via onChange
      expect(receivedValue as unknown as number).toBe(43);

      await instance.destroy();
    } finally {
      (globalThis as any).window = prevWin;
      (globalThis as any).document = prevDoc;
      (globalThis as any).CustomEvent = prevCustomEvent;
      dom.window.close();
    }
  });

  afterAll(() => {
    if (typeof Error.prepareStackTrace === 'function' && Error.prepareStackTrace.name === 'stackTraceRewriter') {
      delete (Error as { prepareStackTrace?: unknown }).prepareStackTrace;
    }
  });
});
