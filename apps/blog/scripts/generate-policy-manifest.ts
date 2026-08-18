import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPolicyManifest } from '../src/lib/policy-content.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outputPath = path.resolve(__dirname, '../src/generated/policy-manifest.ts')

async function main() {
  const manifest = await loadPolicyManifest()
  const contents = `import type { PolicyManifest } from '@jihuayu/site-policy'

/** Generated at build time — do not edit manually. */
export const policyManifest: PolicyManifest = ${JSON.stringify(manifest, null, 2)} as PolicyManifest
`
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, contents, 'utf8')
  console.log(`[policy-manifest] wrote ${Object.keys(manifest.routes).length} routes`)
}

main().catch(error => {
  console.error('[policy-manifest] failed:', error)
  const fallback = `import type { PolicyManifest } from '@jihuayu/site-policy'

export const policyManifest: PolicyManifest = { routes: {}, articles: {} }
`
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, fallback, 'utf8')
  const message = `${error}`
  if (message.includes('integrationToken') || message.includes('NOTION_')) {
    console.warn('[policy-manifest] continuing with empty manifest')
    return
  }
  process.exitCode = 1
})
