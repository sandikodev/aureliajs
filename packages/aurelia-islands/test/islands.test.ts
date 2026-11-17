import { describe, it, expect, vi, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { AdapterRegistry, defaultRegistry, IslandsConfiguration, AureliaIsland } from '../src/index.js';
import type { IslandAdapter, IslandMountContext, IslandInstance } from '../src/types.js';

describe('@aureliajs/islands Suite', () => {
  let doc: Document;

  beforeAll(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    doc = dom.window.document;
  });

  it('should verify all 6 standard adapters are registered by default', () => {
    expect(defaultRegistry.has('react')).toBe(true);
    expect(defaultRegistry.has('vue')).toBe(true);
    expect(defaultRegistry.has('svelte')).toBe(true);
    expect(defaultRegistry.has('solid')).toBe(true);
    expect(defaultRegistry.has('preact')).toBe(true);
    expect(defaultRegistry.has('qwik')).toBe(true);
  });

  it('should support mounting, updating, and destroying via IslandAdapter contract', async () => {
    const registry = new AdapterRegistry();
    const updateSpy = vi.fn();
    const destroySpy = vi.fn();

    const mockAdapter: IslandAdapter = {
      framework: 'custom-framework',
      mount(ctx: IslandMountContext): IslandInstance {
        const span = doc.createElement('span');
        span.textContent = `Count: ${ctx.props.count}`;
        ctx.container.appendChild(span);

        return {
          nativeInstance: span,
          update(nextProps) {
            updateSpy(nextProps);
            if ('count' in nextProps) {
              span.textContent = `Count: ${nextProps.count}`;
            }
          },
          destroy() {
            destroySpy();
            ctx.container.innerHTML = '';
          }
        };
      }
    };

    registry.register(mockAdapter);
    expect(registry.has('custom-framework')).toBe(true);

    const container = doc.createElement('div');
    const instance = await registry.get('custom-framework')!.mount({
      container,
      component: {},
      props: { count: 42 }
    });

    expect(container.textContent).toBe('Count: 42');

    instance.update({ count: 99 });
    expect(updateSpy).toHaveBeenCalledWith({ count: 99 });
    expect(container.textContent).toBe('Count: 99');

    instance.destroy();
    expect(destroySpy).toHaveBeenCalled();
    expect(container.textContent).toBe('');
  });

  it('should register AureliaIsland to container via IslandsConfiguration', () => {
    const containerMock = {
      register: vi.fn()
    };
    IslandsConfiguration.register(containerMock as any);
    expect(containerMock.register).toHaveBeenCalledWith(AureliaIsland);
  });
});
