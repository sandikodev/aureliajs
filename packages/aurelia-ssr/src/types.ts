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
