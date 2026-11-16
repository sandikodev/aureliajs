/**
 * @aureliajs/ssr-playground
 * Examples Loader: Reads real multi-file examples from disk
 */

import fs from 'node:fs';
import path from 'node:path';

export interface ExampleOptions {
  mode: 'ssr' | 'csr' | 'resumable';
  strategy: 'hydrate' | 'static';
  whitelistAudit: boolean;
}

export interface ExampleMeta {
  id: string;
  folder: string;
  category: string;
  title: string;
  description: string;
  componentName: string;
  defaultFile: string;
  files: Record<string, string>;
  ast: Record<string, unknown>;
  context?: Record<string, unknown>;
  options?: ExampleOptions;
}

const EXAMPLES_DIR = path.resolve(
  typeof __dirname !== 'undefined' ? __dirname : process.cwd(),
  typeof __dirname !== 'undefined' ? '../../examples' : 'packages/ssr-playground/examples'
);

export function getExamplesDir(): string {
  if (fs.existsSync(EXAMPLES_DIR)) {
    return EXAMPLES_DIR;
  }
  const fallback = path.resolve(process.cwd(), 'packages/ssr-playground/examples');
  if (fs.existsSync(fallback)) {
    return fallback;
  }
  return path.resolve(process.cwd(), 'examples');
}

export function loadAllExamples(): Record<string, ExampleMeta> {
  const dir = getExamplesDir();
  const folders = fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isDirectory()).sort();

  const registry: Record<string, ExampleMeta> = {};

  for (const folder of folders) {
    const folderPath = path.join(dir, folder);
    const fileNames = fs.readdirSync(folderPath).filter((f) => fs.statSync(path.join(folderPath, f)).isFile()).sort();

    const files: Record<string, string> = {};
    for (const file of fileNames) {
      files[file] = fs.readFileSync(path.join(folderPath, file), 'utf-8');
    }

    const meta = buildExampleMeta(folder, files);
    registry[meta.id] = meta;
  }

  return registry;
}

function buildExampleMeta(folder: string, files: Record<string, string>): ExampleMeta {
  if (files['meta.json']) {
    try {
      const meta = JSON.parse(files['meta.json']);
      delete files['meta.json'];

      const fileKeys = Object.keys(files);
      const defaultFile = meta.defaultFile || fileKeys.find((f) => f.endsWith('.html') || f.endsWith('.aux')) || fileKeys[0] || 'index.html';
      const componentName = meta.componentName || meta.id || folder.replace(/^\d+-/, '');

      let context: Record<string, unknown> = meta.context || {};
      if (files['auth-context.json']) {
        try {
          context = { ...context, ...JSON.parse(files['auth-context.json']) };
        } catch {
          // ignore
        }
      } else if (files['context.json']) {
        try {
          context = { ...context, ...JSON.parse(files['context.json']) };
        } catch {
          // ignore
        }
      }

      return {
        id: meta.id || folder.replace(/^\d+-/, ''),
        folder,
        category: meta.category || 'General',
        title: meta.title || meta.id || folder,
        description: meta.description || '',
        componentName,
        defaultFile,
        files,
        context,
        ast: meta.ast || {
          type: 'CustomElementDefinition',
          name: componentName,
          sourceFile: defaultFile,
          template: {
            file: defaultFile,
            type: 'TemplateDefinition',
            root: 'div',
            children: []
          }
        },
        options: meta.options || { mode: 'ssr', strategy: 'hydrate', whitelistAudit: true }
      };
    } catch (e) {
      console.warn(`[ExampleLoader] Could not parse meta.json in ${folder}:`, e);
    }
  }

  if (folder.includes('01-introduction')) {
    return {
      id: 'hello-world',
      folder,
      category: 'Introduction',
      title: 'Hello World',
      description: 'Clean separation of concerns with paired template and view-model class.',
      componentName: 'hello-world',
      defaultFile: 'hello-world.html',
      files,
      ast: {
        type: 'CustomElementDefinition',
        name: 'hello-world',
        sourceFile: 'hello-world.ts',
        template: {
          file: 'hello-world.html',
          type: 'TemplateDefinition',
          root: 'div.p-8.max-w-lg',
          children: [
            { tag: 'h1', traceFile: 'hello-world.html', traceSearch: '${greeting}', interpolation: '${greeting}, ${name}!' },
            { tag: 'p', traceFile: 'hello-world.html', traceSearch: '${description}', interpolation: '${description}' },
            { tag: 'div', traceFile: 'hello-world.html', traceSearch: 'Server-Side Rendered', text: 'Aurelia 2 Server-Side Rendered' }
          ]
        },
        bindables: ['greeting', 'name', 'description']
      },
      options: { mode: 'ssr', strategy: 'hydrate', whitelistAudit: true }
    };
  }

  if (folder.includes('02-reactivity')) {
    return {
      id: 'counter-card',
      folder,
      category: 'Reactivity',
      title: 'Counter',
      description: 'Two-way bound state and DOM click listeners with zero virtual DOM overhead.',
      componentName: 'counter-card',
      defaultFile: 'counter-card.html',
      files,
      ast: {
        type: 'CustomElementDefinition',
        name: 'counter-card',
        sourceFile: 'counter-card.ts',
        template: {
          file: 'counter-card.html',
          type: 'TemplateDefinition',
          root: 'div.p-6.max-w-sm',
          children: [
            { tag: 'h2', traceFile: 'counter-card.html', traceSearch: '${title}', interpolation: '${title}' },
            { tag: 'p', traceFile: 'counter-card.html', traceSearch: '${description}', interpolation: '${description}' },
            { tag: 'button', traceFile: 'counter-card.html', traceSearch: 'click.trigger="increment()"', binding: 'ListenerBinding [click.trigger="increment()"]' },
            { tag: 'span', traceFile: 'counter-card.html', traceSearch: '${count * 2}', interpolation: '${count * 2}' }
          ]
        },
        bindables: ['title', 'description', 'count'],
        methods: ['increment()']
      },
      options: { mode: 'ssr', strategy: 'hydrate', whitelistAudit: true }
    };
  }

  if (folder.includes('03-aux-component')) {
    return {
      id: 'aux-component',
      folder,
      category: 'Aurelia in HTML',
      title: 'Counter (.aux)',
      description: 'Single-File Component with scoped styles powered by @aureliajs/vite-plugin-aux.',
      componentName: 'counter-card', // mapped for preview execution
      defaultFile: 'counter-widget.aux',
      files,
      ast: {
        type: 'AuxComponentDefinition',
        name: 'counter-widget',
        sourceFile: 'counter-widget.aux',
        template: {
          file: 'counter-widget.aux',
          type: 'AuxTemplateBlock',
          root: 'div.p-6.max-w-sm',
          children: [
            { tag: 'h2', traceFile: 'counter-widget.aux', traceSearch: '${title}', interpolation: '${title}' },
            { tag: 'button', traceFile: 'counter-widget.aux', traceSearch: 'click.trigger="increment()"', binding: 'ListenerBinding [click.trigger="increment()"]' },
            { tag: 'style', traceFile: 'counter-widget.aux', traceSearch: '<style scoped>', text: 'Scoped CSS [data-au-scope]' }
          ]
        },
        script: {
          file: 'counter-widget.aux',
          type: 'TypeScriptBlock',
          className: 'CounterWidget',
          methods: ['increment()']
        }
      },
      options: { mode: 'ssr', strategy: 'hydrate', whitelistAudit: true }
    };
  }

  if (folder.includes('04-props-context')) {
    let contextJson = {};
    if (files['auth-context.json']) {
      try {
        contextJson = JSON.parse(files['auth-context.json']);
      } catch {
        // ignore
      }
    }
    return {
      id: 'user-profile',
      folder,
      category: 'Props & Context',
      title: 'User Profile',
      description: 'Hono SSR Context injection with strict security whitelist and XSS protection.',
      componentName: 'user-profile',
      defaultFile: 'user-profile.html',
      files,
      context: contextJson,
      ast: {
        type: 'CustomElementDefinition',
        name: 'user-profile',
        sourceFile: 'user-profile.ts',
        template: {
          file: 'user-profile.html',
          type: 'TemplateDefinition',
          root: 'div.p-6.max-w-md',
          children: [
            { tag: 'h3', traceFile: 'user-profile.html', traceSearch: '${user.name}', interpolation: '${user.name}' },
            { tag: 'p', traceFile: 'user-profile.html', traceSearch: '${user.email}', interpolation: '${user.email}' },
            { tag: 'strong', traceFile: 'user-profile.html', traceSearch: '${workspace.name}', interpolation: '${workspace.name}' },
            { tag: 'strong', traceFile: 'user-profile.html', traceSearch: '${role}', interpolation: '${role}' }
          ]
        },
        contextBindings: ['user', 'workspace', 'role']
      },
      options: { mode: 'ssr', strategy: 'hydrate', whitelistAudit: true }
    };
  }

  if (folder.includes('05-logic-loops')) {
    return {
      id: 'data-table',
      folder,
      category: 'Logic & Loops',
      title: 'Data Table',
      description: 'High-performance template controller repetition with zero memory leaks.',
      componentName: 'data-table',
      defaultFile: 'data-table.html',
      files,
      ast: {
        type: 'CustomElementDefinition',
        name: 'data-table',
        sourceFile: 'data-table.ts',
        template: {
          file: 'data-table.html',
          type: 'TemplateDefinition',
          root: 'div.p-6.max-w-2xl',
          children: [
            { tag: 'h2', traceFile: 'data-table.html', traceSearch: '${title}', interpolation: '${title}' },
            { tag: 'tr', traceFile: 'data-table.html', traceSearch: 'repeat.for="row of rows"', controller: 'RepeatTemplateController [repeat.for="row of rows"]' },
            { tag: 'td', traceFile: 'data-table.html', traceSearch: '${row.name}', interpolation: '${row.name}' },
            { tag: 'td', traceFile: 'data-table.html', traceSearch: '${row.value}', interpolation: '${row.value}' }
          ]
        },
        templateControllers: ['repeat.for']
      },
      options: { mode: 'ssr', strategy: 'hydrate', whitelistAudit: true }
    };
  }

  // 06-resumable-hydration
  return {
    id: 'resumable-counter',
    folder,
    category: 'Resumable',
    title: 'Resumable Counter',
    description: 'Fine-grained W3C marker adoption with on-demand event dispatching.',
    componentName: 'counter-card', // mapped for preview
    defaultFile: 'resumable-counter.html',
    files,
    ast: {
      type: 'ResumableCustomElementDefinition',
      name: 'resumable-counter',
      sourceFile: 'resumable-counter.ts',
      template: {
        file: 'resumable-counter.html',
        type: 'ResumableTemplateDefinition',
        root: 'div.p-6.max-w-sm',
        children: [
          { tag: 'marker', traceFile: 'resumable-counter.html', traceSearch: '<!--au-resumable:start', marker: '<!--au-resumable:start:resumable-counter-->' },
          { tag: 'button', traceFile: 'resumable-counter.html', traceSearch: 'data-au-event', resumableEvent: 'data-au-event="click->increment"' },
          { tag: 'span', traceFile: 'resumable-counter.html', traceSearch: 'data-au-bind', resumableBind: 'data-au-bind="count"' },
          { tag: 'marker', traceFile: 'resumable-counter.html', traceSearch: '<!--au-resumable:end', marker: '<!--au-resumable:end:resumable-counter-->' }
        ]
      },
      resumableFeatures: ['Lazy Event Delegation', 'Zero-Thrash Marker Adoption', 'Fine-grained State Resumption']
    },
    options: { mode: 'resumable', strategy: 'hydrate', whitelistAudit: true }
  };
}
