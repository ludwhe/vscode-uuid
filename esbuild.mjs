import * as esbuild from 'esbuild';

/**
 * @type esbuild.BuildOptions
 */
const webConfig = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/web/extension.cjs',
  external: ['vscode'],
  format: 'cjs',
  minify: true
};

const config = {
  ...webConfig,
  outfile: 'dist/extension.cjs',
  platform: 'node'
};

await esbuild.build(webConfig);
await esbuild.build(config);
