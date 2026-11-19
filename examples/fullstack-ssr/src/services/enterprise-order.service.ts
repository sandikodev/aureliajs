import { DI } from 'aurelia';

export interface OrderItem {
  id: string;
  title: string;
  department: string;
  budget: number;
  approved: boolean;
}

export interface IEnterpriseOrderService {
  getOrders(): OrderItem[];
  addOrder(title: string, department: string, budget: number): OrderItem;
  toggleApproval(id: string): void;
  removeOrder(id: string): void;
  calculateTotalBudget(): number;
}

/**
 * EnterpriseOrderService - Singleton IoC Service
 * Arsitektur DI yang identik dengan Spring Boot @Service atau NestJS @Injectable()
 */
export class EnterpriseOrderService implements IEnterpriseOrderService {
  private orders: OrderItem[] = [
    { id: 'ORD-101', title: 'Kubernetes Cluster Provisioning', department: 'Cloud Infrastructure', budget: 12500, approved: true },
    { id: 'ORD-102', title: 'Oracle DB Enterprise License', department: 'Core Banking', budget: 48000, approved: false },
    { id: 'ORD-103', title: 'Identity Provider (Keycloak / OAuth2)', department: 'Security & Compliance', budget: 9200, approved: true }
  ];

  getOrders(): OrderItem[] {
    return this.orders;
  }

  addOrder(title: string, department: string, budget: number): OrderItem {
    const newOrder: OrderItem = {
      id: `ORD-${Math.floor(100 + Math.random() * 900)}`,
      title: title || 'New Enterprise Initiative',
      department: department || 'General IT',
      budget: budget || 1000,
      approved: false
    };
    this.orders.push(newOrder);
    return newOrder;
  }

  toggleApproval(id: string): void {
    const found = this.orders.find(o => o.id === id);
    if (found) {
      found.approved = !found.approved;
    }
  }

  removeOrder(id: string): void {
    const idx = this.orders.findIndex(o => o.id === id);
    if (idx !== -1) {
      this.orders.splice(idx, 1);
    }
  }

  calculateTotalBudget(): number {
    return this.orders.reduce((sum, o) => sum + (o.approved ? o.budget : 0), 0);
  }
}

// IoC Identifier Token untuk Dependency Injection
export const IEnterpriseOrderService = DI.createInterface<IEnterpriseOrderService>(
  'IEnterpriseOrderService',
  x => x.singleton(EnterpriseOrderService)
);
