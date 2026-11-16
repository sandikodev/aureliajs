/**
 * @aureliajs/ssr-playground
 * Automated Hydration & DOM Reactivity Test Suite
 *
 * Verifies that server-rendered Aurelia 2 components hydrate in the DOM
 * and re-render correctly on user interactions without requiring manual browser emulation.
 */

import { describe, it, expect } from 'bun:test';
import { JSDOM } from 'jsdom';
import { renderAurelia, serializeState, createHtmlDocument } from '@hono/aurelia-ssr';
import { CounterCard } from '../src/fixtures/counter-card.js';
import { getClientHydrationScript, getPreviewStylesheet } from '../src/server/assets.js';

describe('Aurelia 2 SSR Hydration & Reactivity Verification', () => {
  it('1. Server pre-renders initial state correctly with preserved attributes', async () => {
    const context = {
      user: { id: 'u_test', name: 'Sandikodev', email: 'sandiko@example.com' },
      workspace: { id: 'ws_test', name: 'Lab' },
      role: 'Owner',
    };

    const html = await renderAurelia({
      component: CounterCard,
      context,
    });

    expect(html).toContain('Count: 42');
    expect(html).toContain('Double: 84');
    expect(html).toContain('data-action="increment"');
    expect(html).toContain('data-testid="counter-btn"');
  });

  it('2. Client re-renders count and companion values on DOM click events', async () => {
    const context = {
      user: { id: 'u_test', name: 'Sandikodev', email: 'sandiko@example.com' },
      workspace: { id: 'ws_test', name: 'Lab' },
      role: 'Owner',
    };

    const html = await renderAurelia({
      component: CounterCard,
      context,
    });

    const payload = await serializeState(context, {}, 'counter-card');
    const rawDocument = createHtmlDocument(html, payload, {
      title: 'Counter Card — Test',
    });

    // Enrich document with preview assets
    const fullDocument = rawDocument
      .replace('</head>', `    <style>\n${getPreviewStylesheet()}\n    </style>\n  </head>`)
      .replace('</body>', `    <script>\n${getClientHydrationScript()}\n    </script>\n  </body>`);

    // Emulate Browser DOM environment
    const dom = new JSDOM(fullDocument, {
      runScripts: 'dangerously',
      url: 'http://localhost:4700/preview/counter-card',
      pretendToBeVisual: true,
    });

    const doc = dom.window.document;
    const button = doc.querySelector<HTMLButtonElement>('[data-testid="counter-btn"]');
    const doubleSpan = doc.querySelector<HTMLSpanElement>('[data-testid="double-val"]');


    expect(button).not.toBeNull();
    expect(doubleSpan).not.toBeNull();

    // Initial State Check
    expect(button!.textContent?.trim()).toBe('Count: 42');
    expect(doubleSpan!.textContent?.trim()).toBe('Double: 84');

    // Click #1
    button!.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(button!.textContent?.trim()).toBe('Count: 43');
    expect(doubleSpan!.textContent?.trim()).toBe('Double: 86');

    // Click #2
    button!.click();
    expect(button!.textContent?.trim()).toBe('Count: 44');
    expect(doubleSpan!.textContent?.trim()).toBe('Double: 88');

    // Rapid Clicks #3 to #12 (10 rapid clicks)
    for (let i = 0; i < 10; i++) {
      button!.click();
    }
    expect(button!.textContent?.trim()).toBe('Count: 54');
    expect(doubleSpan!.textContent?.trim()).toBe('Double: 108');

    dom.window.close();
  });

  it('3. Dispatches custom events for automated integration testing', async () => {
    const context = {
      user: null,
      workspace: null,
      role: null,
    };

    const html = await renderAurelia({
      component: CounterCard,
      context,
    });

    const payload = await serializeState(context, {}, 'counter-card');
    const fullDocument = createHtmlDocument(html, payload, { title: 'Event Test' })
      .replace('</body>', `    <script>\n${getClientHydrationScript()}\n    </script>\n  </body>`);

    const dom = new JSDOM(fullDocument, {
      runScripts: 'dangerously',
      url: 'http://localhost:4700/preview/counter-card',
    });

    const doc = dom.window.document;
    const button = doc.querySelector<HTMLButtonElement>('[data-testid="counter-btn"]')!;

    let lastEventDetail: { count: number; double: number } | null = null;
    dom.window.addEventListener('counter:updated', ((e: CustomEvent) => {
      lastEventDetail = e.detail;
    }) as EventListener);

    button.click();

    expect(lastEventDetail).not.toBeNull();
    expect(lastEventDetail!.count).toBe(43);
    expect(lastEventDetail!.double).toBe(86);

    dom.window.close();
  });
});
