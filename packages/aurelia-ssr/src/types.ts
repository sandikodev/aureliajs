/**
 * @aureliajs/ssr Types
 * 
 * Core framework-agnostic type definitions for Aurelia 2 Server-Side Rendering
 * and Direct-DOM Hydration.
 */

/**
 * Render context passed from server environment to renderer
 */
export interface RenderContext {
  user?: User | null;
  workspace?: Workspace | null;
  role?: string | null;
  [key: string]: unknown;
}

/**
 * Standard user representation in rendering context
 */
export interface User {
  id: string;
  email: string;
  name: string;
  [key: string]: unknown;
}

/**
 * Standard workspace/tenant representation in rendering context
 */
export interface Workspace {
  id: string;
  name: string;
  [key: string]: unknown;
}

/**
 * Hydration payload sent from server to client
 * Contains context and preloaded initial data
 */
export interface HydrationPayload {
  component: string;
  context: {
    user: User | null;
    workspace: Workspace | null;
    role: string | null;
    isAuthenticated: boolean;
    [key: string]: unknown;
  };
  initialData?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Hydration result on client-side after extraction
 * Contains validated context and initial data
 */
export interface HydrationResult<TData = Record<string, unknown>> {
  context: {
    user?: User;
    workspace?: Workspace;
    role?: string;
    isAuthenticated: boolean;
    [key: string]: unknown;
  };
  initialData?: TData;
  timestamp: number;
}

/**
 * Isomorphic Request Context interface accessible via Aurelia DI (resolve(IRequestContext))
 * across both server-side SSR and client-side hydration.
 */
export interface IRequestContext<TUser = User, TWorkspace = Workspace> {
  readonly user: TUser | null;
  readonly workspace: TWorkspace | null;
  readonly role: string | null;
  readonly url: string;
  readonly params: Record<string, string>;
  readonly query: Record<string, string>;
  readonly isServer: boolean;
  readonly isClient: boolean;
}

/**
 * Options for renderAurelia() and renderToString()
 */
export interface RenderOptions {
  component: unknown;
  context?: RenderContext;
  props?: Record<string, unknown>;
  timeout?: number;
  registrations?: unknown[];
  settle?: number;
  url?: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

/**
 * Options for createHtmlDocument()
 */
export interface DocumentOptions {
  title?: string;
  lang?: string;
  basePath?: string;
  cssBundle?: string;
  jsBundle?: string;
  nonce?: string;
  meta?: Record<string, string>[];
}

/**
 * Hydration options for client-side hydration
 */
export interface HydrationOptions {
  autoRestoreAuth?: boolean;
  autoCacheData?: boolean;
  debug?: boolean;
}

/**
 * Options for client-side automated component hydration (createClientHydrator)
 */
export interface ClientHydratorOptions {
  components: Record<string, unknown> | unknown[];
  target?: string | HTMLElement;
  fallback?: unknown;
  registrations?: unknown[];
  payloadKey?: string;
  onHydrated?: (componentName: string, instance: unknown) => void;
  onError?: (error: unknown) => void;
}
