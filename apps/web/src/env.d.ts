/// <reference types="vite/client" />

/** Aurelia's Vite plugin turns `*.html` imports into compiled templates. */
declare module '*.html' {
  const template: string;
  export default template;
}

/** Vite plugin for Aurelia 2 .aux Single-File Components. */
declare module '*.aux' {
  import type { Constructable } from '@aurelia/kernel';
  const component: Constructable;
  export default component;
  export const badgeVariants: (props?: Record<string, unknown>) => string;
  export const buttonVariants: (props?: Record<string, unknown>) => string;
  export const UiAlert: Constructable;
  export const UiAvatar: Constructable;
  export const UiBadge: Constructable;
  export const UiButton: Constructable;
  export const UiCard: Constructable;
  export const UiCardHeader: Constructable;
  export const UiCardTitle: Constructable;
  export const UiCardDescription: Constructable;
  export const UiCardContent: Constructable;
  export const UiCardFooter: Constructable;
  export const UiIcon: Constructable;
  export const UiInput: Constructable;
  export const UiLabel: Constructable;
  export const UiSelect: Constructable;
  export const UiSeparator: Constructable;
  export const UiSkeleton: Constructable;
  export const UiTextarea: Constructable;
  export const UiToaster: Constructable;
}
