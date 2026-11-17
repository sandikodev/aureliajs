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
    <div class="island-wrapper">
      <div class="glue-code-badge \${badgeClass}">
        <span>✨ Aurelia Convention Island (\${typeTitle})</span>
      </div>
      <div class="universal-mount-node island-mount-point"></div>
    </div>
  `
})
export class AureliaIsland {
  @bindable type: IslandFramework = 'react';
  @bindable component: any;
  @bindable props: Record<string, any> = {};
  @bindable value?: any;
  @bindable onChange?: (val: any) => void;
  @bindable onUpdate?: (event: string, payload: any) => void;

  private element: HTMLElement = resolve(INode) as HTMLElement;
  private instance: IslandInstance | null = null;
  private registry: AdapterRegistry = defaultRegistry;

  get badgeClass(): string {
    return `${this.type}-badge`;
  }

  get typeTitle(): string {
    switch (this.type) {
      case 'react': return 'React 19';
      case 'vue': return 'Vue 3';
      case 'svelte': return 'Svelte 5';
      case 'solid': return 'SolidJS';
      case 'preact': return 'Preact';
      case 'qwik': return 'Qwik';
      default: return this.type;
    }
  }

  async attached(): Promise<void> {
    const mountPoint = this.element.querySelector('.island-mount-point') as HTMLElement;
    if (!mountPoint || !this.component) return;

    const adapter = this.registry.get(this.type);
    if (!adapter) {
      console.warn(`[@aureliajs/islands] No adapter registered for framework: "${this.type}".`);
      return;
    }

    const mergedProps = {
      ...(this.props || {}),
      ...(this.value !== undefined ? { value: this.value } : {})
    };

    try {
      this.instance = await adapter.mount({
        container: mountPoint,
        component: this.component,
        props: mergedProps,
        onUpdate: (event: string, payload: any) => {
          if (event === 'change') {
            this.value = payload;
            if (typeof this.onChange === 'function') {
              this.onChange(payload);
            }
          }
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
      const merged = {
        ...(newProps || {}),
        ...(this.value !== undefined ? { value: this.value } : {})
      };
      this.instance.update(merged);
    }
  }

  valueChanged(newValue: any): void {
    if (this.instance) {
      this.instance.update({ value: newValue });
    }
  }

  async detaching(): Promise<void> {
    if (this.instance) {
      await this.instance.destroy();
      this.instance = null;
    }
  }
}
