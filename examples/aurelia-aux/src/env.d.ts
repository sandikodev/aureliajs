/// <reference types="vite/client" />

declare module '*.aux' {
  import type { Constructable } from 'aurelia';
  const component: Constructable;
  export default component;
  export const HomePage: Constructable;
  export const DashboardPage: Constructable;
  export const PostDetailPage: Constructable;
  export const IslandsPage: Constructable;
  export const PricingIsland: Constructable;
}

declare module '*.html' {
  const content: string;
  export default content;
}
