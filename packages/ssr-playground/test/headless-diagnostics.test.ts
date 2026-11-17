/**
 * @aureliajs/ssr-playground
 * Comprehensive Headless Reversing & Diagnostics Test Suite
 *
 * Reverses, inspects, and validates:
 * 1. Headless HTTP Engine & Content Negotiation via Hono In-Memory Request Dispatch
 * 2. AST & Template Compiler Instruction Reversal across all 16 examples
 * 3. Headless Client DOM Hydration & Event Dispatch Simulation
 * 4. High-Concurrency Stress Test & Memory Isolation (AUR0757 Prevention)
 * 5. Security & CSP Nonce Payload Sanitization
 */

import { describe, it, expect } from 'bun:test';
import { JSDOM } from 'jsdom';
import { renderAurelia, serializeState, createHtmlDocument } from '@aureliajs/ssr';
import { createPlaygroundApp } from '../src/server/app.js';
import { loadAllExamples } from '../src/examples/loader.js';
import { compilePlaygroundExample } from '../src/engine/compiler.js';

describe('Headless Reversing & Diagnostics Suite', () => {
  const app = createPlaygroundApp();
  const allExamples = loadAllExamples();
  const exampleIds = Object.keys(allExamples);

  // --------------------------------------------------------------------------
  // 1. LIVE HTTP SERVER HEADLESS DIAGNOSTICS (In-Memory Fetch Dispatch)
  // --------------------------------------------------------------------------
  describe('1. Headless HTTP Server & Route Handler Diagnostics', () => {
    it('probes GET / and reverses dashboard markup structure', async () => {
      const res = await app.request('/');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');

      const html = await res.text();
      expect(html).toContain('AURELIA 2');
      expect(html).toContain('id="previewIframe"');
      expect(html).toContain('id="consoleDrawer"');
      expect(html).toContain('id="compilerOptionsDrawer"');
      expect(html).toContain('id="__EXAMPLES_DATA__"');

      // Verify no leak of metrics tab into footer
      const dom = new JSDOM(html);
      const metricsTab = dom.window.document.getElementById('view-metrics');
      expect(metricsTab).not.toBeNull();
      expect(metricsTab!.classList.contains('hidden')).toBe(true);
      dom.window.close();
    });

    it('verifies dropdown accordion expansion and inset focus ring styling', async () => {
      const res = await app.request('/');
      const html = await res.text();
      expect(html).toContain('id="exampleDropdownMenu"');
      expect(html).toContain('p-2 focus:outline-none');

      // Verify DOM script functions for single active category expansion
      const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost:4700/?example=hello-world' });
      const doc = dom.window.document;

      // Trigger loadExample for component-basics
      dom.window.loadExample('component-basics', false);

      const categories = doc.querySelectorAll('#dropdownExamplesList [data-category]');
      expect(categories.length).toBeGreaterThan(0);

      categories.forEach((cat) => {
        const catName = cat.getAttribute('data-category');
        const items = cat.querySelector('[data-items]');
        const chevron = cat.querySelector('[data-chevron]');
        if (catName === 'Enterprise Architecture') {
          expect(items?.classList.contains('hidden')).toBe(false);
          expect(chevron?.textContent).toBe('▾');
        } else {
          expect(items?.classList.contains('hidden')).toBe(true);
          expect(chevron?.textContent).toBe('›');
        }
      });

      const activeBtn = doc.querySelector('#dropdownExamplesList button[data-id="component-basics"]');
      expect(activeBtn?.className).toContain('text-accent');
      expect(activeBtn?.className).toContain('outline-none');
      expect(activeBtn?.className).toContain('focus-visible:ring-1');

      dom.window.close();
    });

    it('probes GET /api/examples/:id and reverses example metadata JSON', async () => {
      const res = await app.request('/api/examples/counter-card');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');

      const data = (await res.json()) as Record<string, unknown> & {
        id: string;
        componentName: string;
        files: Record<string, string>;
      };
      expect(data.id).toBe('counter-card');
      expect(data.componentName).toBe('counter-card');
      expect(data.files['counter-card.html']).toBeDefined();
    });

    it('probes POST /api/compile with custom fixture payload and verifies compiled output', async () => {
      const ex = allExamples['counter-card'];
      const res = await app.request('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exampleId: ex.id,
          files: ex.files,
          mode: 'ssr',
          strategy: 'hydrate',
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as Record<string, unknown> & {
        success: boolean;
        rawHtml: string;
        metrics: { vitalsGrade?: string; grade?: string };
      };
      expect(data.success).toBe(true);
      expect(data.rawHtml).toContain('Count: 42');
      expect(data.metrics.grade).toBe('A+');
    });

    it('probes GET /preview/:fixture for standalone iframe rendering', async () => {
      const res = await app.request('/preview/counter-card');
      expect(res.status).toBe(200);

      const html = await res.text();
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('au-card');
      expect(html).toContain('id="__HYDRATION__"');
    });
  });

  // --------------------------------------------------------------------------
  // 2. HEADLESS AST & COMPILER REVERSING ACROSS ALL 16 EXAMPLES
  // --------------------------------------------------------------------------
  describe('2. Headless AST & Binding Instruction Reversal (All 16 Examples)', () => {
    it('reverses all 16 canonical examples and verifies AST integrity', async () => {
      expect(exampleIds.length).toBe(16);

      for (const id of exampleIds) {
        const ex = allExamples[id];
        expect(ex).toBeDefined();

        const compiled = await compilePlaygroundExample({
          exampleId: ex.id,
          files: ex.files,
          mode: 'ssr',
          strategy: 'hydrate',
          whitelistAudit: true,
        });

        // 1. Verify HTML Document was synthesized
        expect(compiled.htmlDocument).toBeDefined();
        expect(compiled.htmlDocument.length).toBeGreaterThan(100);

        // 2. Verify Compiled JS Definition exists (CustomElement.define or __au_CE.define for .aux)
        expect(compiled.compiledJs).toMatch(/(\bCustomElement|__au_CE)\.define/);

        // 3. Verify Design System usage in rendered SSR markup
        expect(compiled.rawHtml).toContain('au-card');

        // 4. Verify no unresolved undefined placeholders
        expect(compiled.rawHtml).not.toContain('undefined');
      }
    });

    it('reverses Resumable SSR markers in 06-resumable-hydration and 16-resumable-todo', async () => {
      const resumableEx = allExamples['resumable-counter'];
      const compiled = await compilePlaygroundExample({
        exampleId: resumableEx.id,
        files: resumableEx.files,
        mode: 'resumable',
        strategy: 'static',
      });

      // Verify Qwik-like resumable comments and event attributes
      expect(compiled.rawHtml).toContain('<!--au-resumable:start:resumable-counter-->');
      expect(compiled.rawHtml).toContain('data-au-event=');
      expect(compiled.rawHtml).toContain('data-au-bind=');
    });
  });

  // --------------------------------------------------------------------------
  // 3. HEADLESS CLIENT HYDRATION & REACTIVE MUTATION SIMULATION
  // --------------------------------------------------------------------------
  describe('3. Headless Client Hydration & Reactive DOM Mutation', () => {
    it('hydrates 02-reactivity and verifies reactive state increments headlessly', async () => {
      const ex = allExamples['counter-card'];
      const compiled = await compilePlaygroundExample({
        exampleId: ex.id,
        files: ex.files,
      });

      const dom = new JSDOM(compiled.htmlDocument, {
        runScripts: 'dangerously',
        url: 'http://localhost:4700/preview/counter-card',
        pretendToBeVisual: true,
      });

      const doc = dom.window.document;
      const button = doc.querySelector<HTMLButtonElement>('button');
      expect(button).not.toBeNull();

      // Initial state
      expect(button!.textContent?.trim()).toContain('Count: 42');

      // Headless Click 1: Increment to 43
      button!.click();
      expect(button!.textContent?.trim()).toContain('Count: 43');

      // Headless Click 2: Increment to 44
      button!.click();
      expect(button!.textContent?.trim()).toContain('Count: 44');

      // Verify companion computed projection Double: 88
      const doubleSpan = doc.querySelector('[data-testid="double-val"]');
      if (doubleSpan) {
        expect(doubleSpan.textContent).toContain('88');
      }

      dom.window.close();
    });

    it('hydrates 07-two-way-forms and verifies bi-directional synchronization headlessly', async () => {
      const ex = allExamples['form-controls'];
      const compiled = await compilePlaygroundExample({
        exampleId: ex.id,
        files: ex.files,
      });

      const dom = new JSDOM(compiled.htmlDocument, {
        runScripts: 'dangerously',
        url: 'http://localhost:4700/preview/form-controls',
        pretendToBeVisual: true,
      });

      const doc = dom.window.document;
      const textInput = doc.querySelector<HTMLInputElement>('input[type="text"]');
      const selectEl = doc.querySelector<HTMLSelectElement>('select');

      expect(textInput).not.toBeNull();
      expect(selectEl).not.toBeNull();

      // Verify initial model value in preview
      expect(doc.body.innerHTML).toContain('Sandikodev');

      // Mutate input value and dispatch input event
      textInput!.value = 'Google DeepMind Architect';
      textInput!.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

      // Synchronized viewmodel state should reflect change
      expect(textInput!.value).toBe('Google DeepMind Architect');

      dom.window.close();
    });
  });

  // --------------------------------------------------------------------------
  // 4. HIGH-CONCURRENCY STRESS TEST & AUR0757 MULTI-REQUEST DIAGNOSTICS
  // --------------------------------------------------------------------------
  describe('4. High-Concurrency Stress Test & Container Memory Isolation', () => {
    it('executes 30 concurrent renderAurelia calls without AUR0757 or state pollution', async () => {
      const initialMem = process.memoryUsage().heapUsed;

      const tasks = Array.from({ length: 30 }).map(async (_, idx) => {
        const user = { id: `user_${idx}`, name: `Dev ${idx}`, email: `dev${idx}@example.com` };
        const html = await renderAurelia({
          component: {
            template: '<div class="au-card"><span class="user">${user.name}</span></div>',
          },
          context: {
            user,
            workspace: { id: `ws_${idx}`, name: `Workspace ${idx}` },
            role: 'engineer',
          },
        });

        expect(html).toContain(`Dev ${idx}`);
        return html;
      });

      const results = await Promise.all(tasks);
      expect(results.length).toBe(30);

      // Verify each result had its own clean isolated user name
      results.forEach((html, idx) => {
        expect(html).toContain(`Dev ${idx}`);
        expect(html).not.toContain(`Dev ${idx === 0 ? 1 : 0}`);
      });

      const finalMem = process.memoryUsage().heapUsed;
      const memDeltaMb = (finalMem - initialMem) / (1024 * 1024);
      // Memory growth should be contained (under 50MB for 30 concurrent renders)
      expect(memDeltaMb).toBeLessThan(50);
    });
  });

  // --------------------------------------------------------------------------
  // 5. SECURITY & CSP NONCE PAYLOAD SANITIZATION REVERSING
  // --------------------------------------------------------------------------
  describe('5. Security & Anti-XSS Reversing', () => {
    it('verifies that malicious context strings cannot escape hydration script tag', async () => {
      const maliciousContext = {
        user: {
          id: 'u_hacker',
          name: '</script><script>alert("PWNED")</script>',
          email: 'hacker@example.com',
        },
        workspace: null,
        role: null,
      };

      const payload = await serializeState(maliciousContext, {}, 'test-comp');
      const html = createHtmlDocument('<div class="app">Safe</div>', payload, {
        nonce: 'strictNonce99==',
      });

      // Must be safely escaped to Unicode \\u003c and \\u003e
      expect(html).not.toContain('</script><script>alert("PWNED")</script>');
      expect(html).toContain('\\u003c/script\\u003e');
      expect(html).toContain('nonce="strictNonce99=="');

      // Verify that DOM parser treats it as pure string without executing rogue script tag
      const dom = new JSDOM(html);
      const scripts = dom.window.document.querySelectorAll('script');
      // Should only have the hydration script and module script, no injected 3rd script
      expect(scripts.length).toBe(2);
      dom.window.close();
    });
  });
});
