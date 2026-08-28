import { defineConfig } from 'tsup'
import { stylexEsbuildPlugin } from '../../scripts/stylex-esbuild-plugin'

export default defineConfig({
  entry: {
    index: 'src/index.tsx',
    theme: 'src/theme.stylex.ts'
  },
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  platform: 'browser',
  external: ['react', 'react-dom'],
  esbuildPlugins: [
    stylexEsbuildPlugin({
      baseCssPath: 'src/styles.css',
      outputCssPath: 'dist/styles.css'
    })
  ]
})
