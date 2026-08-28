import { defineConfig } from 'tsup'
import { stylexEsbuildPlugin } from '../../scripts/stylex-esbuild-plugin'

export default defineConfig([
  {
    entry: {
      client: 'src/client.ts',
      index: 'src/index.ts',
      prepare: 'src/prepare.ts',
      theme: 'src/theme.stylex.ts'
    },
    format: ['esm'],
    dts: false,
    sourcemap: true,
    clean: true,
    target: 'es2020',
    external: ['react', 'react-dom'],
    esbuildPlugins: [
      stylexEsbuildPlugin({
        baseCssPath: 'src/styles.css',
        outputCssPath: 'dist/styles.css'
      })
    ]
  }
])
