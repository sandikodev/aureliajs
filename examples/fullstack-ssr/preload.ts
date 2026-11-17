import { plugin } from 'bun';
import * as fs from 'node:fs';
import { parseAux, compileAux } from '@aureliajs/vite-plugin-aux';

// Native Bun loader for Aurelia 2 Single-File Components (.aux)
plugin({
  name: 'bun-aux-plugin',
  setup(builder) {
    builder.onLoad({ filter: /\.aux$/ }, async (args) => {
      const source = await fs.promises.readFile(args.path, 'utf8');
      const descriptor = parseAux(source, args.path);
      const compiled = compileAux(descriptor, { isServer: true });
      return {
        contents: compiled.code,
        loader: 'ts',
      };
    });
  },
});
