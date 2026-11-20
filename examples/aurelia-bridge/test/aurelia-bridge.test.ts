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
  it('registers BridgeConfiguration, AuBridge, and AureliaIsland in Aurelia DI container', () => {
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
  });

  afterAll(() => {
    if (typeof Error.prepareStackTrace === 'function' && Error.prepareStackTrace.name === 'stackTraceRewriter') {
      delete (Error as { prepareStackTrace?: unknown }).prepareStackTrace;
    }
  });
});
