import { plugin } from 'bun';
import { parseAux, compileAux } from '@aureliajs/vite-plugin-aux';

// Native Bun loader for Aurelia 2 Single-File Components (.aux)
plugin({
  name: 'bun-aux-plugin',
  setup(builder) {
    builder.onLoad({ filter: /\.aux$/ }, async (args) => {
      const source = await Bun.file(args.path).text();
      const descriptor = parseAux(source, args.path);
      const compiled = compileAux(descriptor, { isServer: true });
      return {
        contents: compiled.code,
        loader: 'ts',
      };
    });
  },
});
