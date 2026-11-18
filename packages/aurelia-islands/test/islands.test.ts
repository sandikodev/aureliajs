import { describe, it, expect, vi, beforeAll } from 'vitest';
import {
  AdapterRegistry,
  defaultRegistry,
  IslandsConfiguration,
  AureliaIsland,
  createReactAdapter,
  createVueAdapter,
  createSvelteAdapter,
  createSolidAdapter,
  createPreactAdapter,
  createQwikAdapter
} from '../src/index.js';
import type { IslandAdapter, IslandMountContext, IslandInstance } from '../src/types.js';

// Zero-dependency Mock DOM Engine for lightning-fast hermetic testing
class MockElement {
  tagName: string;
  textContent: string = '';
  innerHTML: string = '';
  className: string = '';
  children: MockElement[] = [];
  parentElement: MockElement | null = null;
  onclick: (() => void) | null = null;

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  get firstElementChild(): MockElement | null {
    return this.children[0] || null;
  }

  appendChild(child: MockElement): MockElement {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  querySelector(selector: string): MockElement | null {
    const cls = selector.replace(/^\./, '');
    for (const c of this.children) {
      if (c.className.split(' ').includes(cls)) return c;
      const found = c.querySelector(selector);
      if (found) return found;
    }
    return null;
  }
}

describe('@aureliajs/islands Comprehensive Suite (by Sandikodev)', () => {
  let doc: any;

  beforeAll(() => {
    doc = {
      createElement: (tag: string) => new MockElement(tag)
    };
    (globalThis as any).document = doc;
    (globalThis as any).HTMLElement = MockElement;
  });

  it('should verify all 6 standard adapters are registered by default in registry', () => {
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

    expect(container.children[0].textContent).toBe('Count: 42');

    instance.update({ count: 99 });
    expect(updateSpy).toHaveBeenCalledWith({ count: 99 });
    expect(container.children[0].textContent).toBe('Count: 99');

    instance.destroy();
    expect(destroySpy).toHaveBeenCalled();
    expect(container.innerHTML).toBe('');
  });

  it('should register AureliaIsland to container via IslandsConfiguration', () => {
    const containerMock = {
      register: vi.fn()
    };
    IslandsConfiguration.register(containerMock as any);
    expect(containerMock.register).toHaveBeenCalledWith(AureliaIsland);

    const custom = IslandsConfiguration.customize({ defaultFramework: 'vue' });
    custom.register(containerMock as any);
    expect(containerMock.register).toHaveBeenCalledTimes(2);
  });

  it('should verify React adapter lifecycle and event propagation with injected mocks', async () => {
    const renderSpy = vi.fn();
    const unmountSpy = vi.fn();
    const mockReact = {
      createElement: vi.fn((comp, props) => ({ comp, props }))
    };
    const mockReactDOM = {
      createRoot: vi.fn((_container) => ({
        render: renderSpy,
        unmount: unmountSpy
      }))
    };

    const adapter = createReactAdapter(mockReact, mockReactDOM);
    const container = doc.createElement('div');
    const onUpdateSpy = vi.fn();

    const instance = await adapter.mount({
      container,
      component: () => null,
      props: { value: 10 },
      onUpdate: onUpdateSpy
    });

    expect(mockReactDOM.createRoot).toHaveBeenCalledWith(container);
    expect(renderSpy).toHaveBeenCalled();

    // Verify passing increment
    const passedProps = renderSpy.mock.calls[0][0].props;
    passedProps.onIncrement();
    expect(onUpdateSpy).toHaveBeenCalledWith('change', 11);

    instance.update({ value: 20 });
    expect(renderSpy).toHaveBeenCalledTimes(2);

    instance.destroy();
    expect(unmountSpy).toHaveBeenCalled();
  });

  it('should verify Vue adapter lifecycle and event propagation with injected mocks', async () => {
    const mountSpy = vi.fn();
    const unmountSpy = vi.fn();
    const mockVue = {
      createApp: vi.fn((options) => {
        options.render();
        return {
          mount: mountSpy,
          unmount: unmountSpy
        };
      }),
      h: vi.fn((comp, props) => ({ comp, props })),
      reactive: vi.fn((val) => ({ ...val }))
    };

    const adapter = createVueAdapter(mockVue);
    const container = doc.createElement('div');
    const onUpdateSpy = vi.fn();

    const instance = await adapter.mount({
      container,
      component: {},
      props: { value: 50 },
      onUpdate: onUpdateSpy
    });

    expect(mockVue.createApp).toHaveBeenCalled();
    expect(mountSpy).toHaveBeenCalledWith(container);

    const renderedProps = mockVue.h.mock.calls[0]?.[1];
    expect(renderedProps).toBeDefined();
    renderedProps!.onCounterChange(51);
    expect(onUpdateSpy).toHaveBeenCalledWith('change', 51);

    instance.update({ value: 100 });
    instance.destroy();
    expect(unmountSpy).toHaveBeenCalled();
  });

  it('should verify Svelte adapter lifecycle with injected mocks', async () => {
    const unmountSpy = vi.fn();
    const mockSvelte = {
      mount: vi.fn((_comp, _opts) => {
        return {
          updateFromHost: vi.fn()
        };
      }),
      unmount: unmountSpy
    };

    const adapter = createSvelteAdapter(mockSvelte);
    const container = doc.createElement('div');
    const onUpdateSpy = vi.fn();

    const instance = await adapter.mount({
      container,
      component: {},
      props: { value: 7 },
      onUpdate: onUpdateSpy
    });

    expect(mockSvelte.mount).toHaveBeenCalled();
    const passedProps = mockSvelte.mount.mock.calls[0]?.[1]?.props;
    expect(passedProps).toBeDefined();
    passedProps!.onCounterChange(8);
    expect(onUpdateSpy).toHaveBeenCalledWith('change', 8);

    instance.update({ value: 9 });
    expect(instance.nativeInstance.updateFromHost).toHaveBeenCalledWith(9);

    instance.destroy();
    expect(unmountSpy).toHaveBeenCalled();
  });

  it('should verify SolidJS adapter lifecycle with injected mocks', async () => {
    const disposeSpy = vi.fn();
    const mockSolidWeb = {
      render: vi.fn((fn, _container) => {
        fn();
        return disposeSpy;
      })
    };
    const mockSolidCore = {
      createSignal: vi.fn((initial) => {
        let val = initial;
        return [() => val, (setter: any) => { val = typeof setter === 'function' ? setter(val) : setter; }];
      })
    };

    const adapter = createSolidAdapter(mockSolidWeb, mockSolidCore);
    const container = doc.createElement('div');
    const onUpdateSpy = vi.fn();
    const mockComponent = vi.fn();

    const instance = await adapter.mount({
      container,
      component: mockComponent,
      props: { value: 33 },
      onUpdate: onUpdateSpy
    });

    expect(mockSolidWeb.render).toHaveBeenCalled();
    expect(mockComponent).toHaveBeenCalled();

    const compArgs = mockComponent.mock.calls[0][0];
    expect(compArgs.value()).toBe(33);
    compArgs.onCounterChange(34);
    expect(onUpdateSpy).toHaveBeenCalledWith('change', 34);

    instance.update({ value: 40 });
    instance.destroy();
    expect(disposeSpy).toHaveBeenCalled();
  });

  it('should verify Preact adapter lifecycle with injected mocks', async () => {
    const renderSpy = vi.fn();
    const mockPreact = {
      render: renderSpy,
      h: vi.fn((comp, props) => ({ comp, props }))
    };

    const adapter = createPreactAdapter(mockPreact);
    const container = doc.createElement('div');
    const onUpdateSpy = vi.fn();

    const instance = await adapter.mount({
      container,
      component: () => null,
      props: { value: 12 },
      onUpdate: onUpdateSpy
    });

    expect(mockPreact.render).toHaveBeenCalled();
    const hProps = mockPreact.h.mock.calls[0]?.[1];
    expect(hProps).toBeDefined();
    hProps!.onCounterChange(13);
    expect(onUpdateSpy).toHaveBeenCalledWith('change', 13);

    instance.update({ value: 15 });
    instance.destroy();
    expect(renderSpy).toHaveBeenCalledWith(null, container);
  });

  it('should verify Qwik adapter lifecycle and button click listeners', async () => {
    const renderSpy = vi.fn().mockResolvedValue(undefined);
    const mockQwik = {
      render: renderSpy,
      jsx: vi.fn((comp, props) => ({ comp, props }))
    };

    const adapter = createQwikAdapter(mockQwik);
    const container = doc.createElement('div');
    const onUpdateSpy = vi.fn();

    const instance = await adapter.mount({
      container,
      component: () => null,
      props: { value: 88 },
      onUpdate: onUpdateSpy
    });

    expect(renderSpy).toHaveBeenCalled();
    const child = container.firstElementChild as MockElement;
    expect(child).toBeDefined();

    // Emulate buttons created inside child
    const incBtn = doc.createElement('button');
    incBtn.className = 'qwik-inc-btn';
    child.appendChild(incBtn);

    const valSpan = doc.createElement('span');
    valSpan.className = 'qwik-val';
    valSpan.textContent = '88';
    child.appendChild(valSpan);

    instance.update({ value: 89 });
    expect(valSpan.textContent).toBe('89');

    instance.destroy();
    expect(container.innerHTML).toBe('');
  });
});
