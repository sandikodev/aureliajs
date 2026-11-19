import { plugin } from 'bun';

plugin({
  name: 'html-loader',
  setup(builder) {
    builder.onLoad({ filter: /\.html$/ }, async (args) => {
      const text = await Bun.file(args.path).text();
      return {
        contents: `export default ${JSON.stringify(text)};`,
        loader: 'js',
      };
    });
  },
});
