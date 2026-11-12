/// <reference types="vite/client" />

/** Aurelia's Vite plugin turns `*.html` imports into compiled templates. */
declare module '*.html' {
  const template: string;
  export default template;
}
