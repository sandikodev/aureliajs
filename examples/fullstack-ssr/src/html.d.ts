declare module '*.html' {
  const content: string;
  export default content;
}

declare module '*.aux' {
  const component: any;
  export default component;
  export const HomePage: any;
  export const PostDetailPage: any;
  export const DashboardPage: any;
  export const SsrBadge: any;
  export const loader: any;
  export const actions: any;
  export const title: any;
}
