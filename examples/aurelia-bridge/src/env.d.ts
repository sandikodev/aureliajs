/// <reference types="vite/client" />

declare module '*.html' {
  const content: string;
  export default content;
}

// Seamless interop between Bun.HTMLBundle and Aurelia 2 template definition
declare module '@aurelia/template-compiler' {
  interface PartialCustomElementDefinition {
    template?: string | Node | null | unknown;
  }
}

declare module '*.vue' {
  import type { Component } from 'vue';
  const component: Component;
  export default component;
}

declare module '*.svelte' {
  import type { Component } from 'svelte';
  const component: Component<any>;
  export default component;
}

declare module 'jsdom';
