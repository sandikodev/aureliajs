import { plugin } from 'bun';

// Native Bun loader for HTML templates (returns template string directly)
plugin({
  name: 'bun-html-plugin',
  setup(builder) {
    builder.onLoad({ filter: /\.html$/ }, async (args) => {
      const contents = await Bun.file(args.path).text();
      return {
        contents: `export default ${JSON.stringify(contents)};`,
        loader: 'js',
      };
    });
  },
});

// Native Bun loader for Vue 3 SFCs (.vue)
plugin({
  name: 'bun-vue-plugin',
  setup(builder) {
    builder.onLoad({ filter: /\.vue$/ }, async (args) => {
      const source = await Bun.file(args.path).text();
      const { parse, compileScript } = await import('@vue/compiler-sfc');
      const { descriptor } = parse(source, { filename: args.path });
      const compiled = compileScript(descriptor, { id: 'vue-sfc', inlineTemplate: true });
      return { contents: compiled.content, loader: 'ts' };
    });
  },
});

// Native Bun loader for Svelte 5 Runes (.svelte)
plugin({
  name: 'bun-svelte-plugin',
  setup(builder) {
    builder.onLoad({ filter: /\.svelte$/ }, async (args) => {
      const source = await Bun.file(args.path).text();
      const { compile } = await import('svelte/compiler');
      const compiled = compile(source, { filename: args.path, generate: 'client', runes: true });
      return { contents: compiled.js.code, loader: 'js' };
    });
  },
});

// Native Bun loader for SolidJS (.solid.tsx or solid-*.tsx)
plugin({
  name: 'bun-solid-plugin',
  setup(builder) {
    builder.onLoad({ filter: /(solid-.*|\.solid)\.tsx$/ }, async (args) => {
      const source = await Bun.file(args.path).text();
      const babel = await import('@babel/core');
      const transformed = babel.transformSync(source, {
        filename: args.path,
        presets: [
          '@babel/preset-typescript',
          ['babel-preset-solid', { generate: 'ssr', hydratable: true }],
        ],
      });
      return { contents: transformed?.code ?? '', loader: 'js' };
    });
  },
});
