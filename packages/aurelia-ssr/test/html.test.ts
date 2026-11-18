import { describe, it, expect } from 'bun:test';
import { JSDOM } from 'jsdom';
import {
  DEFAULT_SCRIPT_ID,
  createDocumentShell,
  createHtmlDocument,
  createHydrationScript,
  escapeAttr,
  escapeHtml,
  validateHtmlStructure,
} from '../src/html.js';
import { serializeState } from '../src/serialize.js';

describe('HTML5 Document Builder', () => {
  it('embeds state via HTML5 standard <script type="application/json"> with zero window pollution', async () => {
    const payload = await serializeState({ theme: 'dark', locale: 'id' }, { count: 7 }, 'home-page');
    const html = createHtmlDocument('<main>Hi</main>', payload, { title: 'Home' });

    expect(validateHtmlStructure(html)).toBe(true);
    expect(html).toContain(`<script id="${DEFAULT_SCRIPT_ID}" type="application/json">`);
    expect(html).not.toContain('window.__HYDRATION__');
    expect(html).not.toContain('class="h-full"');

    const dom = new JSDOM(html);
    const scriptEl = dom.window.document.getElementById(DEFAULT_SCRIPT_ID);
    expect(scriptEl).not.toBeNull();
    expect(scriptEl?.getAttribute('type')).toBe('application/json');

    const parsed = JSON.parse(scriptEl?.textContent ?? '{}');
    expect(parsed.component).toBe('home-page');
    expect(parsed.context).toEqual({ theme: 'dark', locale: 'id' });
    expect(parsed.initialData).toEqual({ count: 7 });
    dom.window.close();
  });

  it('splits preamble and postamble cleanly for true streaming SSR', async () => {
    const shell = createDocumentShell({
      title: 'Streamed Page',
      cssBundle: '/app.css',
      jsBundle: '/client.js',
      rootTag: 'my-app',
    });

    expect(shell.preamble).toContain('<!DOCTYPE html>');
    expect(shell.preamble).toContain('<link rel="stylesheet" href="/app.css" />');
    expect(shell.preamble).toContain('<my-app>');
    expect(shell.postamble).toContain('</my-app>');
    expect(shell.postamble).toContain('<script type="module" src="/client.js"></script>');
    expect(shell.postamble).toContain('</html>');

    const payload = await serializeState({ ok: true }, {}, 'my-app');
    const full = `${shell.preamble}<div>Body</div>${createHydrationScript(payload)}${shell.postamble}`;
    expect(validateHtmlStructure(full)).toBe(true);
  });

  it('supports CSP nonce on external module scripts, custom rootTag, and template overrides', async () => {
    const payload = await serializeState({ mode: 'strict' }, {}, 'app');
    const html = createHtmlDocument('<p>Content</p>', payload, {
      lang: 'id',
      basePath: '/sub/',
      rootTag: false,
      nonce: 'n123==',
      cssBundle: ['/a.css', '/b.css'],
      jsBundle: '/entry.js',
      htmlAttrs: { 'data-env': 'prod' },
      bodyAttrs: { class: 'root' },
    });

    expect(html).toContain('<html lang="id" data-env="prod">');
    expect(html).toContain('<body class="root">');
    expect(html).toContain('<base href="/sub/" />');
    expect(html).toContain('<script type="module" src="/entry.js" nonce="n123=="></script>');
    expect(html).not.toContain('<app-root>');

    const custom = createHtmlDocument('<p>Hi</p>', payload, {
      template: ({ body, hydrationScript }) => `<!DOCTYPE html><html><head></head><body>${body}${hydrationScript}</body></html>`,
    });
    expect(custom).toContain('<app-root><p>Hi</p></app-root>');
    expect(custom).toContain('type="application/json"');
  });

  it('escapes HTML text and attributes safely', () => {
    expect(escapeHtml('<script>"a" & \'b\'</script>')).toBe(
      '&lt;script&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/script&gt;'
    );
    expect(escapeAttr('a"b&c\'d')).toBe('a&quot;b&amp;c&#39;d');
  });
});
