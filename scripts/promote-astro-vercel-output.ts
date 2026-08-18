import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { attachPolicyRouterMiddleware, type VercelOutputConfig } from './vercel-output-config'

const repoRoot = process.cwd()
const from = path.join(repoRoot, 'apps/blog/.vercel/output')
const to = path.join(repoRoot, '.vercel/output')

if (!existsSync(from)) {
  throw new Error(`Astro Vercel output missing at ${from}. Did pnpm blog:build finish?`)
}

rmSync(to, { recursive: true, force: true })
cpSync(from, to, { recursive: true })

const configPath = path.join(to, 'config.json')
if (!existsSync(configPath)) {
  throw new Error(`Vercel config missing at ${configPath}`)
}

const config = JSON.parse(readFileSync(configPath, 'utf8')) as VercelOutputConfig
const nextConfig = attachPolicyRouterMiddleware(config)
writeFileSync(configPath, `${JSON.stringify(nextConfig, null, '\t')}\n`)

console.log(`[vercel] promoted ${from} -> ${to}`)
console.log('[vercel] attached policy router dest after filesystem; /site is fetch-only')
