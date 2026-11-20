import { customElement, resolve, optional, IPlatform } from 'aurelia';
import { IEnterpriseOrderService, OrderItem } from './services/enterprise-order.service';
import { OrderItemCard } from './components/order-item';
import { FormatNumberValueConverter } from './converters/format-number';

// Base Template
import template from './my-app.html?raw';

// ------------------------------------------------------------------------------------------------
// PURE FRONTEND COMPONENTS (Leaf UI widgets authored in their respective framework conventions)
// ------------------------------------------------------------------------------------------------
// 1. React 19 Functional Component (VDOM, Hooks & Ref DOM Manipulation)
import { ReactCounter } from './components/frontend/counter.react';

// 2. Vue 3 SFC Component (<script setup>, reactive props & template refs)
import VueCounter from './components/frontend/counter.vue';

// 3. Svelte 5 Runes Component ($state, $effect & direct DOM element bindings)
import SvelteCounter from './components/frontend/counter.svelte';

// 4. SolidJS Component (Fine-grained reactive signals & direct DOM refs)
import { SolidCounter } from './components/frontend/counter.solid';

// 5. Preact 3kB Component (Virtual DOM & hooks)
import { PreactCounter } from './components/frontend/counter.preact';

// 6. Qwik Resumable Component (Serializable QRL boundaries & useSignal)
import { QwikCounter } from './components/frontend/counter.qwik';

// 7. HTMX 2.0 Pure Hypermedia Component (Zero Client JS, DOM Fragment Swapping)
import { HtmxCard } from './components/frontend/htmx';

export interface AuditLogEntry {
  id: string;
  source: string;
  previousValue: number;
  newValue: number;
  timestamp: string;
}

/**
 * ================================================================================================
 * ARCHITECTURAL SCOPE & BOUNDARIES SPECIFICATION
 * ================================================================================================
 *
 * 1. AURELIA 2 ENTERPRISE HOST BOUNDARY:
 *    - Owns business domain logic, database operations, IoC services, and route workflows.
 *    - Injects `IEnterpriseOrderService` via the container (`resolve(IEnterpriseOrderService)`).
 *    - Coordinates global cross-cutting state (`sharedCounter`, `orders`, `auditTrail`).
 *    - Executes host-level DOM manipulation (e.g. host flash animation, status badges) without
 *      interfering with or assuming knowledge of any foreign framework's virtual DOM.
 *
 * 2. FOREIGN FRAMEWORK BOUNDARY (React, Vue, Svelte, Solid, Preact, Qwik, HTMX):
 *    - Each component is authored as an authentic, idiomatic component of that ecosystem.
 *    - Owns its own ISOLATED private state (e.g. `localClicks`, `localStep`) invisible to Aurelia.
 *    - Owns its own ISOLATED DOM manipulation (e.g. ref meters, canvas, element style mutations).
 *    - Participates in SHARED state bidirectionally: receives `value.bind="sharedCounter"` and
 *      invokes `onChange(nextValue)` to notify Aurelia of user-initiated shared mutations.
 * ================================================================================================
 */
@customElement({
  name: 'my-app',
  template,
  dependencies: [
    OrderItemCard,
    FormatNumberValueConverter,
    HtmxCard,
  ],
})
export class MyApp {
  // Expose pure framework components for Aurelia template binding
  public readonly ReactCounter = ReactCounter;
  public readonly VueCounter = VueCounter;
  public readonly SvelteCounter = SvelteCounter;
  public readonly SolidCounter = SolidCounter;
  public readonly PreactCounter = PreactCounter;
  public readonly QwikCounter = QwikCounter;

  // ----------------------------------------------------------------------------------------------
  // 1. AURELIA ENTERPRISE SERVICES & IOC BOUNDARY
  // ----------------------------------------------------------------------------------------------
  private readonly orderService = resolve(IEnterpriseOrderService);
  private readonly platform = resolve(optional(IPlatform));

  public orders: OrderItem[] = [];
  public newTitle: string = '';
  public newDept: string = '';
  public newBudget: number = 5000;

  // ----------------------------------------------------------------------------------------------
  // 2. POLYGLOT COORDINATION & BIDIRECTIONAL SHARED STATE
  // ----------------------------------------------------------------------------------------------
  /** Global metric shared across all 7 frameworks */
  public sharedCounter: number = 42;

  /** Real-time audit trail recording every state change and its exact origin */
  public auditTrail: AuditLogEntry[] = [];

  // Host DOM element reference for host-level DOM manipulation
  public polyglotGridRef?: HTMLElement;

  binding(): void {
    this.refreshOrders();
    this.logAudit('Aurelia Enterprise Host', 0, this.sharedCounter);
  }

  refreshOrders(): void {
    this.orders = [...this.orderService.getOrders()];
  }

  get totalApprovedBudget(): number {
    return this.orderService.calculateTotalBudget();
  }

  addOrder(e: Event): void {
    e.preventDefault();
    if (!this.newTitle) return;

    this.orderService.addOrder(this.newTitle, this.newDept, Number(this.newBudget));
    this.newTitle = '';
    this.newDept = '';
    this.newBudget = 5000;
    this.refreshOrders();
  }

  toggleOrder(id: string): void {
    this.orderService.toggleApproval(id);
    this.refreshOrders();
  }

  removeOrder(id: string): void {
    this.orderService.removeOrder(id);
    this.refreshOrders();
  }

  // ----------------------------------------------------------------------------------------------
  // 3. BIDIRECTIONAL STATE SYNCHRONIZATION HANDLER
  // ----------------------------------------------------------------------------------------------
  /**
   * Invoked whenever any foreign framework (React, Vue, Svelte, Solid, Preact, Qwik)
   * emits an `onChange` event or when the host dispatches a state update.
   */
  handleCounterUpdate = (val: number, sourceName?: string): void => {
    const prev = this.sharedCounter;
    this.sharedCounter = val;
    this.logAudit(sourceName ?? 'Foreign Component', prev, val);
  };

  /** Specific framework event bridge handler */
  handleBridgeEvent = (framework: string, event: string, payload: unknown): void => {
    if (event === 'change' && typeof payload === 'number') {
      const prev = this.sharedCounter;
      this.sharedCounter = payload;
      this.logAudit(`${framework.toUpperCase()} Component`, prev, payload);
    }
  };

  // ----------------------------------------------------------------------------------------------
  // 4. AURELIA HOST-LEVEL DOM MANIPULATION & BROADCAST
  // ----------------------------------------------------------------------------------------------
  /**
   * Demonstrates Aurelia Host-level DOM manipulation:
   * Aurelia directly manipulates host-level DOM elements (e.g. triggering an attention pulse
   * on the host container) without interfering with the internal DOM of foreign subtrees.
   */
  public triggerHostPulse(): void {
    if (this.polyglotGridRef) {
      this.polyglotGridRef.classList.remove('host-highlight-pulse');
      // Trigger browser reflow to restart CSS animation
      void this.polyglotGridRef.offsetWidth;
      this.polyglotGridRef.classList.add('host-highlight-pulse');
    }
  }

  /** Aurelia host broadcasts an increment surge to all 7 frameworks simultaneously */
  public broadcastSurge(delta: number): void {
    const prev = this.sharedCounter;
    this.sharedCounter += delta;
    this.logAudit(`Aurelia Host Broadcast (+${delta})`, prev, this.sharedCounter);
    this.triggerHostPulse();
  }

  /** Aurelia host resets shared metric across all frameworks */
  public broadcastReset(): void {
    const prev = this.sharedCounter;
    this.sharedCounter = 0;
    this.logAudit('Aurelia Host Broadcast (Reset)', prev, 0);
    this.triggerHostPulse();
  }

  private logAudit(source: string, prev: number, next: number): void {
    const time = new Date().toLocaleTimeString();
    const entry: AuditLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      source,
      previousValue: prev,
      newValue: next,
      timestamp: time,
    };
    this.auditTrail.unshift(entry);
    if (this.auditTrail.length > 20) {
      this.auditTrail.pop();
    }
  }
}
