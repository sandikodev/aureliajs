/**
 * Global initialization for Aurelia Bridge Example
 * Sets runtime flags before any framework dependencies evaluate.
 */
(globalThis as any).qRuntimeQrl = true;
if (typeof window !== 'undefined') {
  (window as any).qRuntimeQrl = true;
  if (!(window as any).qwikevents) {
    (window as any).qwikevents = ['click', 'input', 'change', 'keydown', 'keyup'];
  }
}
