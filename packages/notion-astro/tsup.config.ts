import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  external: ['@jihuayu/notion-render-core', '@jihuayu/notion-type', 'katex']
})
