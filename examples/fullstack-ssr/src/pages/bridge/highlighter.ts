import Prism from 'prismjs';
import 'prismjs/components/prism-markup.js';
import 'prismjs/components/prism-javascript.js';
import 'prismjs/components/prism-typescript.js';
import 'prismjs/components/prism-jsx.js';
import 'prismjs/components/prism-tsx.js';
import 'prismjs/components/prism-css.js';

/**
 * Universal syntax highlighter for Polyglot Frontends:
 * - TSX / JSX: React, Solid, Preact, Qwik
 * - TypeScript: Lit, HTMX, Bridge
 * - Single-File Components: Vue (.vue), Svelte (.svelte), Aurelia (.aux)
 * - Compiled Output: JavaScript (ESM)
 * - Live DOM: HTML5 Markup
 */
export function highlightCode(code: string, fileOrLang = 'markup'): string {
  if (!code) return '';

  const clean = code.trim();
  const lower = fileOrLang.toLowerCase();

  // 1. Single-File Components with embedded <script> and <style>
  if (
    lower.endsWith('.vue') ||
    lower.endsWith('.svelte') ||
    lower.endsWith('.aux') ||
    lower === 'sfc'
  ) {
    const parts = clean.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>)/gi);
    return parts
      .map((part) => {
        if (part.startsWith('<script')) {
          const match = part.match(/(<script[\s\S]*?>)([\s\S]*?)(<\/script>)/i);
          if (!match) return Prism.highlight(part, Prism.languages.markup, 'markup');
          return (
            Prism.highlight(match[1], Prism.languages.markup, 'markup') +
            Prism.highlight(match[2], Prism.languages.tsx, 'tsx') +
            Prism.highlight(match[3], Prism.languages.markup, 'markup')
          );
        }
        if (part.startsWith('<style')) {
          const match = part.match(/(<style[\s\S]*?>)([\s\S]*?)(<\/style>)/i);
          if (!match) return Prism.highlight(part, Prism.languages.markup, 'markup');
          return (
            Prism.highlight(match[1], Prism.languages.markup, 'markup') +
            Prism.highlight(match[2], Prism.languages.css, 'css') +
            Prism.highlight(match[3], Prism.languages.markup, 'markup')
          );
        }
        return Prism.highlight(part, Prism.languages.markup, 'markup');
      })
      .join('');
  }

  // 2. React, SolidJS, Preact, Qwik (TSX / JSX)
  if (lower.endsWith('.tsx') || lower.endsWith('.jsx') || lower === 'tsx' || lower === 'jsx') {
    return Prism.highlight(clean, Prism.languages.tsx, 'tsx');
  }

  // 3. Lit, TypeScript
  if (lower.endsWith('.ts') || lower === 'ts' || lower === 'typescript') {
    return Prism.highlight(clean, Prism.languages.typescript, 'typescript');
  }

  // 4. Compiled Browser Output (JavaScript ESM)
  if (lower.endsWith('.js') || lower === 'js' || lower === 'javascript') {
    return Prism.highlight(clean, Prism.languages.javascript, 'javascript');
  }

  // 5. Generated Live DOM / HTML
  return Prism.highlight(clean, Prism.languages.markup, 'markup');
}
