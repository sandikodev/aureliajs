import { customElement, resolve } from 'aurelia';
import { IEnterpriseOrderService, OrderItem } from './services/enterprise-order.service';
import { OrderItemCard } from './components/order-item';
import { ReactCounter } from './components/frontend/react-counter';
import VueCounter from './components/frontend/vue-counter.vue';
import SvelteCounter from './components/frontend/svelte-counter.svelte';
import { SolidCounter } from './components/frontend/solid-counter';
import { PreactCounter } from './components/frontend/preact-counter';
import { QwikCounter } from './components/frontend/qwik-counter';
import { FormatNumberValueConverter } from './converters/format-number';
import template from './my-app.html';

@customElement({
  name: 'my-app',
  template,
  dependencies: [
    OrderItemCard,
    FormatNumberValueConverter
  ]
})
export class MyApp {
  // Expose pure framework components for Aurelia template binding
  public ReactCounter = ReactCounter;
  public VueCounter = VueCounter;
  public SvelteCounter = SvelteCounter;
  public SolidCounter = SolidCounter;
  public PreactCounter = PreactCounter;
  public QwikCounter = QwikCounter;

  // Dependency Injection via Aurelia 2 resolve API (mirip @Injectable / @Autowired)
  private orderService = resolve(IEnterpriseOrderService);

  public orders: OrderItem[] = [];
  public newTitle: string = '';
  public newDept: string = '';
  public newBudget: number = 5000;
  public sharedCounter: number = 42;

  binding(): void {
    this.refreshOrders();
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

  handleCounterUpdate = (val: number): void => {
    this.sharedCounter = val;
  };
}
