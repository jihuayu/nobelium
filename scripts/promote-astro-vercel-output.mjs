import { cpSync, existsSync, rmSync } from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const from = path.join(repoRoot, 'apps/blog/.vercel/output')
const to = path.join(repoRoot, '.vercel/output')

if (!existsSync(from)) {
  throw new Error(`Astro Vercel output missing at ${from}. Did pnpm blog:build finish?`)
}

rmSync(to, { recursive: true, force: true })
cpSync(from, to, { recursive: true })
console.log(`[vercel] promoted ${from} -> ${to}`)
