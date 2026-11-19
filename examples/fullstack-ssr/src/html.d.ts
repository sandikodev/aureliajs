declare module '*.html' {
  const content: string;
  export default content;
}

interface ImportMeta {
  readonly dir: string;
  readonly file: string;
  readonly main: boolean;
}
