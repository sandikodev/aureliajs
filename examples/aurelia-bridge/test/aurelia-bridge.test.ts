import { describe, it, expect } from 'bun:test';
import { DI, IContainer } from 'aurelia';
import { BridgeConfiguration, IBridgeRegistry, AuBridge, AureliaIsland } from '@aureliajs/bridge';
import { EnterpriseOrderService, IEnterpriseOrderService } from '../src/services/enterprise-order.service.js';
import { MyApp } from '../src/my-app.js';

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
    app.handleCounterUpdate(99);
    expect(app.sharedCounter).toBe(99);
  });
});
