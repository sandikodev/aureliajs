/// <reference types="vite/client" />

declare module '*.html' {
  const content: string;
  export default content;
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
