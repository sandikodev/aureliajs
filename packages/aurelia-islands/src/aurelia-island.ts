/**
 * @aureliajs/islands - Universal Aurelia Custom Element
 * Maintained by Sandikodev (https://github.com/sandikodev)
 */

import { customElement, bindable, resolve, INode } from 'aurelia';
import type { IslandFramework, IslandInstance } from './types.js';
import { defaultRegistry, AdapterRegistry } from './adapters/index.js';

@customElement({
  name: 'aurelia-island',
  template: `
    <div class="aurelia-island-root">
      <div class="island-mount-point"></div>
    </div>
  `
})
export class AureliaIsland {
  @bindable type: IslandFramework = 'react';
  @bindable component: any;
  @bindable props: Record<string, any> = {};
  @bindable onUpdate?: (event: string, payload: any) => void;

  private element: HTMLElement = resolve(INode) as HTMLElement;
  private instance: IslandInstance | null = null;
  private registry: AdapterRegistry = defaultRegistry;

  async attached(): Promise<void> {
    const mountPoint = this.element.querySelector('.island-mount-point') as HTMLElement;
    if (!mountPoint || !this.component) return;

    const adapter = this.registry.get(this.type);
    if (!adapter) {
      console.warn(`[@aureliajs/islands] No adapter registered for framework: "${this.type}".`);
      return;
    }

    try {
      this.instance = await adapter.mount({
        container: mountPoint,
        component: this.component,
        props: this.props || {},
        onUpdate: (event, payload) => {
          if (typeof this.onUpdate === 'function') {
            this.onUpdate(event, payload);
          }
        }
      });
    } catch (err) {
      console.error(`[@aureliajs/islands] Error mounting island (${this.type}):`, err);
    }
  }

  propsChanged(newProps: Record<string, any>): void {
    if (this.instance) {
      this.instance.update(newProps || {});
    }
  }

  async detaching(): Promise<void> {
    if (this.instance) {
      await this.instance.destroy();
      this.instance = null;
    }
  }
}
