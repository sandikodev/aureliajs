declare module '*.html' {
  const content: string;
  export default content;
}

declare module '*.aux' {
  import type { Constructable } from 'aurelia';
  const component: Constructable;
  export default component;
  export const SsrBadge: Constructable;
}
