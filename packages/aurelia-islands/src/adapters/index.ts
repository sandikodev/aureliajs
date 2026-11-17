/**
 * @aureliajs/islands - Framework Adapters
 * Maintained by Sandikodev (https://github.com/sandikodev)
 */

import type { IslandAdapter, IslandFramework, IslandInstance, IslandMountContext } from '../types.js';

export class AdapterRegistry {
  private adapters = new Map<string, IslandAdapter>();

  register(adapter: IslandAdapter): this {
    this.adapters.set(adapter.framework, adapter);
    return this;
  }

  get(framework: IslandFramework): IslandAdapter | undefined {
    return this.adapters.get(framework);
  }

  has(framework: IslandFramework): boolean {
    return this.adapters.has(framework);
  }
}

/**
 * React 18/19 Adapter
 */
export function createReactAdapter(reactModule?: any, reactDomClientModule?: any): IslandAdapter {
  return {
    framework: 'react',
    async mount(context: IslandMountContext): Promise<IslandInstance> {
      const React = reactModule ?? (await import('react')).default ?? (await import('react'));
      const ReactDOM = reactDomClientModule ?? (await import('react-dom/client')).default ?? (await import('react-dom/client'));

      const root = ReactDOM.createRoot(context.container);
      let currentProps = { ...context.props };

      const createMergedProps = (props: Record<string, any>) => ({
        ...props,
        onUpdate: (event: string, payload: any) => context.onUpdate?.(event, payload),
        onChange: (val: any) => context.onUpdate?.('change', val),
        onCounterChange: (val: any) => context.onUpdate?.('change', val),
        onIncrement: () => {
          const current = Number(currentProps.value ?? 0);
          context.onUpdate?.('change', current + 1);
        },
        onDecrement: () => {
          const current = Number(currentProps.value ?? 0);
          context.onUpdate?.('change', current - 1);
        },
        onReset: () => {
          context.onUpdate?.('change', 0);
        }
      });

      root.render(React.createElement(context.component, createMergedProps(currentProps)));

      return {
        nativeInstance: root,
        update(nextProps) {
          currentProps = { ...currentProps, ...nextProps };
          root.render(React.createElement(context.component, createMergedProps(currentProps)));
        },
        destroy() {
          root.unmount();
        }
      };
    }
  };
}

/**
 * Vue 3 Adapter
 */
export function createVueAdapter(vueModule?: any): IslandAdapter {
  return {
    framework: 'vue',
    async mount(context: IslandMountContext): Promise<IslandInstance> {
      const { createApp, h, reactive } = vueModule ?? (await import('vue'));

      const reactiveProps = reactive({ ...context.props });
      const app = createApp({
        render() {
          return h(context.component, {
            ...reactiveProps,
            onUpdate: (event: string, payload: any) => context.onUpdate?.(event, payload),
            onChange: (val: any) => context.onUpdate?.('change', val),
            onCounterChange: (val: any) => context.onUpdate?.('change', val)
          });
        }
      });

      app.mount(context.container);

      return {
        nativeInstance: app,
        update(nextProps) {
          Object.assign(reactiveProps, nextProps);
        },
        destroy() {
          app.unmount();
        }
      };
    }
  };
}

/**
 * Svelte 5 Adapter
 */
export function createSvelteAdapter(svelteModule?: any): IslandAdapter {
  return {
    framework: 'svelte',
    async mount(context: IslandMountContext): Promise<IslandInstance> {
      const { mount, unmount } = svelteModule ?? (await import('svelte'));

      let currentProps = { ...context.props };
      const instance = mount(context.component, {
        target: context.container,
        props: {
          ...currentProps,
          onUpdate: (event: string, payload: any) => context.onUpdate?.(event, payload),
          onChange: (val: any) => context.onUpdate?.('change', val),
          onCounterChange: (val: any) => context.onUpdate?.('change', val)
        }
      });

      return {
        nativeInstance: instance,
        update(nextProps) {
          currentProps = { ...currentProps, ...nextProps };
          if (instance && typeof (instance as any).updateFromHost === 'function') {
            (instance as any).updateFromHost(nextProps.value ?? nextProps);
          } else if (instance && typeof (instance as any).$set === 'function') {
            (instance as any).$set(nextProps);
          }
        },
        destroy() {
          unmount(instance);
        }
      };
    }
  };
}

/**
 * SolidJS Adapter
 */
export function createSolidAdapter(solidWebModule?: any, solidCoreModule?: any): IslandAdapter {
  return {
    framework: 'solid',
    async mount(context: IslandMountContext): Promise<IslandInstance> {
      const { render } = solidWebModule ?? (await import('solid-js/web'));
      const { createSignal } = solidCoreModule ?? (await import('solid-js'));

      const [getProps, setProps] = createSignal({ ...context.props });

      const dispose = render(() => {
        return context.component({
          get props() { return getProps(); },
          value: () => getProps().value,
          onUpdate: (event: string, payload: any) => context.onUpdate?.(event, payload),
          onChange: (val: any) => context.onUpdate?.('change', val),
          onCounterChange: (val: any) => context.onUpdate?.('change', val)
        });
      }, context.container);

      return {
        nativeInstance: dispose,
        update(nextProps) {
          setProps((prev: any) => ({ ...prev, ...nextProps }));
        },
        destroy() {
          dispose();
        }
      };
    }
  };
}

/**
 * Preact Adapter
 */
export function createPreactAdapter(preactModule?: any): IslandAdapter {
  return {
    framework: 'preact',
    async mount(context: IslandMountContext): Promise<IslandInstance> {
      const { render, h } = preactModule ?? (await import('preact'));
      let currentProps = { ...context.props };

      const doRender = (props: Record<string, any>) => {
        render(
          h(context.component, {
            ...props,
            onUpdate: (event: string, payload: any) => context.onUpdate?.(event, payload),
            onChange: (val: any) => context.onUpdate?.('change', val),
            onCounterChange: (val: any) => context.onUpdate?.('change', val)
          }),
          context.container
        );
      };

      doRender(currentProps);

      return {
        nativeInstance: context.container,
        update(nextProps) {
          currentProps = { ...currentProps, ...nextProps };
          doRender(currentProps);
        },
        destroy() {
          render(null, context.container);
        }
      };
    }
  };
}

/**
 * Qwik Adapter
 */
export function createQwikAdapter(qwikModule?: any): IslandAdapter {
  return {
    framework: 'qwik',
    async mount(context: IslandMountContext): Promise<IslandInstance> {
      const { render, jsx } = qwikModule ?? (await import('@builder.io/qwik'));

      context.container.innerHTML = '';
      const child = document.createElement('div');
      context.container.appendChild(child);

      let currentProps = { ...context.props };

      await render(child, jsx(context.component, {
        ...currentProps,
        onUpdate: (event: string, payload: any) => context.onUpdate?.(event, payload),
        onChange: (val: any) => context.onUpdate?.('change', val),
        onCounterChange: (val: any) => context.onUpdate?.('change', val)
      }));

      // Bind interactive button clicks inside Qwik container
      const attachListeners = () => {
        const inc = child.querySelector('.qwik-inc-btn') as HTMLElement;
        const dec = child.querySelector('.qwik-dec-btn') as HTMLElement;
        const reset = child.querySelector('.qwik-reset-btn') as HTMLElement;
        if (inc) {
          inc.onclick = () => {
            const next = Number(currentProps.value ?? 0) + 1;
            context.onUpdate?.('change', next);
          };
        }
        if (dec) {
          dec.onclick = () => {
            const next = Number(currentProps.value ?? 0) - 1;
            context.onUpdate?.('change', next);
          };
        }
        if (reset) {
          reset.onclick = () => {
            context.onUpdate?.('change', 0);
          };
        }
      };
      attachListeners();

      return {
        nativeInstance: child,
        update(nextProps) {
          currentProps = { ...currentProps, ...nextProps };
          const valSpan = child.querySelector('.qwik-val');
          if (valSpan && 'value' in nextProps) {
            valSpan.textContent = String(nextProps.value);
          }
        },
        destroy() {
          context.container.innerHTML = '';
        }
      };
    }
  };
}

export const defaultRegistry = new AdapterRegistry()
  .register(createReactAdapter())
  .register(createVueAdapter())
  .register(createSvelteAdapter())
  .register(createSolidAdapter())
  .register(createPreactAdapter())
  .register(createQwikAdapter());
