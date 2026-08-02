import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.tsx'
  },
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  platform: 'browser',
  external: ['react', 'react-dom']
})
