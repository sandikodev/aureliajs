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

      const render = (props: Record<string, any>) => {
        root.render(React.createElement(context.component, {
          ...props,
          onUpdate: (event: string, payload: any) => context.onUpdate?.(event, payload)
        }));
      };

      render(currentProps);

      return {
        nativeInstance: root,
        update(nextProps) {
          currentProps = { ...currentProps, ...nextProps };
          render(currentProps);
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
            onUpdate: (event: string, payload: any) => context.onUpdate?.(event, payload)
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

      const instance = mount(context.component, {
        target: context.container,
        props: {
          ...context.props,
          onUpdate: (event: string, payload: any) => context.onUpdate?.(event, payload)
        }
      });

      return {
        nativeInstance: instance,
        update(nextProps) {
          if (instance && typeof (instance as any).updateFromHost === 'function') {
            (instance as any).updateFromHost(nextProps);
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
          props: getProps,
          onUpdate: (event: string, payload: any) => context.onUpdate?.(event, payload)
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
            onUpdate: (event: string, payload: any) => context.onUpdate?.(event, payload)
          }),
          context.container
        );
      };

      doRender(currentProps);

      return {
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

      await render(child, jsx(context.component, {
        ...context.props,
        onUpdate: (event: string, payload: any) => context.onUpdate?.(event, payload)
      }));

      return {
        nativeInstance: child,
        update(nextProps) {
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
