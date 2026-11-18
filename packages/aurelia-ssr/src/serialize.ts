/**
 * @aureliajs/ssr State Serialization
 *
 * Pure ECMA/Web-Standard serializer for transferring SSR state inside
 * HTML5 `<script type="application/json">` elements.
 * Supports optional standard `replacer`, circular reference handling,
 * and script-context XSS escaping without opinionated key guessing.
 */

import type { HydrationPayload, SerializeOptions } from './types.js';

/**
 * Serialize request context and initial loader data into a HydrationPayload.
 */
export async function serializeState<
  TContext extends Record<string, unknown> = Record<string, unknown>,
  TData = Record<string, unknown>,
>(
  context: TContext = {} as TContext,
  initialData?: TData,
  componentName?: string,
  options?: SerializeOptions
): Promise<HydrationPayload<TContext, TData>> {
  const replacer = options?.replacer;

  try {
    const cleanedContext = (sanitizeValue('', context, replacer) ?? {}) as TContext;
    const cleanedData =
      initialData !== undefined
        ? (sanitizeValue('', initialData, replacer) as TData | undefined)
        : undefined;

    return {
      component: componentName || 'unknown',
      context: cleanedContext,
      initialData: cleanedData,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('[serializeState] ERROR:', error);

    return {
      component: componentName || 'unknown',
      context: {} as TContext,
      timestamp: Date.now(),
    };
  }
}

function sanitizeValue(
  key: string,
  rawValue: unknown,
  replacer?: (key: string, value: unknown) => unknown,
  seen = new WeakSet<object>()
): unknown {
  const data = replacer ? replacer(key, rawValue) : rawValue;

  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (typeof data === 'function' || typeof data === 'symbol') {
    return undefined;
  }

  if (data instanceof Date) {
    return data.toISOString();
  }

  if (typeof data === 'object') {
    if (seen.has(data)) {
      return '[Circular]';
    }
    seen.add(data);

    if (Array.isArray(data)) {
      return data.map((item, idx) => sanitizeValue(String(idx), item, replacer, seen));
    }

    const result: Record<string, unknown> = {};
    for (const [propKey, propVal] of Object.entries(data)) {
      if (typeof propVal === 'function' || typeof propVal === 'symbol') {
        continue;
      }
      const cleaned = sanitizeValue(propKey, propVal, replacer, seen);
      if (cleaned !== undefined) {
        result[propKey] = cleaned;
      }
    }
    return result;
  }

  return undefined;
}

/**
 * Verify a hydration payload can be serialized to JSON without throwing.
 */
export function validatePayload<
  TContext extends Record<string, unknown> = Record<string, unknown>,
  TData = Record<string, unknown>,
>(payload: HydrationPayload<TContext, TData>): boolean {
  try {
    JSON.stringify(payload);
    return true;
  } catch {
    return false;
  }
}

/**
 * Serialize payload to an XSS-safe JSON string suitable for `<script type="application/json">`.
 * Escapes `<`, `>`, `&`, `\u2028`, and `\u2029` so untrusted strings cannot break out of `<script>`.
 */
export function stringifyPayload<
  TContext extends Record<string, unknown> = Record<string, unknown>,
  TData = Record<string, unknown>,
>(payload: HydrationPayload<TContext, TData>): string {
  return JSON.stringify(payload)
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
