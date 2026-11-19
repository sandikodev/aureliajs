declare module '*.html' {
  const content: string;
  export default content;
}

declare module '*.vue' {
  const component: unknown;
  export default component;
}

declare module '*.svelte' {
  const component: unknown;
  export default component;
}

declare module '*.aux' {
  const component: any;
  export default component;
  export const HomePage: any;
  export const PostDetailPage: any;
  export const DashboardPage: any;
  export const IslandsPage: any;
  export const BridgePage: any;
  export const PricingIsland: any;
  export const SsrBadge: any;
  export const loader: any;
  export const actions: any;
  export const title: any;
}

interface ImportMeta {
  readonly dir: string;
  readonly file: string;
  readonly main: boolean;
}

declare module 'prismjs' {
  const Prism: any;
  export default Prism;
}

declare module 'prismjs/*' {
  const content: any;
  export default content;
}

declare namespace React {
  export type FC<P = Record<string, any>> = (props: P) => any;
  export type ComponentType<P = any> = any;
  export const createElement: any;
}

declare module 'react' {
  const ReactDefault: any;
  export default ReactDefault;
  export = React;
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const jsxDEV: any;
  export namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
