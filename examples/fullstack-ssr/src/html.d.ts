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

interface ImportMeta {
  readonly dir: string;
  readonly file: string;
  readonly main: boolean;
}
