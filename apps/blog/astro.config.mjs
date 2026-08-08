import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@astrojs/react'
import vercel from '@astrojs/vercel'
import { defineConfig } from 'astro/config'

const rootDir = fileURLToPath(new URL('../../', import.meta.url))
const blogDir = fileURLToPath(new URL('./', import.meta.url))
const serverOnlyStub = path.resolve(rootDir, 'node_modules/next/dist/compiled/server-only/empty.js')

export default defineConfig({
  output: 'static',
  adapter: vercel({
    edgeMiddleware: true
  }),
  integrations: [react()],
  site: process.env.SITE_URL || 'https://blog.jihuayu.com',
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: [
        { find: '@blog', replacement: path.resolve(blogDir, 'src') },
        { find: '@jihuayu/notion-react/styles.css', replacement: path.resolve(rootDir, 'packages/notion-react/src/styles.css') },
        { find: '@jihuayu/notion-react', replacement: path.resolve(rootDir, 'packages/notion-react/src/index.ts') },
        { find: '@jihuayu/notion-render-core', replacement: path.resolve(rootDir, 'packages/notion-render-core/src/index.ts') },
        { find: '@jihuayu/site-policy', replacement: path.resolve(rootDir, 'packages/site-policy/src/index.ts') },
        { find: '@jihuayu/notion-astro/styles.css', replacement: path.resolve(rootDir, 'packages/notion-astro/src/styles.css') },
        { find: '@jihuayu/notion-astro', replacement: path.resolve(rootDir, 'packages/notion-astro/src/index.ts') },
        { find: 'server-only', replacement: serverOnlyStub },
        { find: '@', replacement: rootDir }
      ]
    },
    ssr: {
      noExternal: ['@jihuayu/somnium-comments']
    }
  }
})
