import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { AGENT_SKILL_MARKDOWN } from '@/lib/agent-discovery'
import { config } from '@/lib/server/config'
import { buildSiteAbsoluteUrl, buildSiteOrigin, buildSiteRelativePath } from '@/lib/server/sitemap'

export const dynamic = 'force-static'

function discoveryHeaders() {
  return {
    'Cache-Control': 'public, max-age=3600',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept'
  }
}

function absolute(path: string): string {
  return buildSiteAbsoluteUrl(
    buildSiteOrigin(config.link || ''),
    buildSiteRelativePath(config.path || '', path)
  )
}

export function GET() {
  const digest = createHash('sha256').update(AGENT_SKILL_MARKDOWN, 'utf8').digest('hex')

  return NextResponse.json({
    $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
    skills: [
      {
        name: 'blog-discovery',
        type: 'skill-md',
        description: 'Discover and use the public blog APIs, documentation, Markdown homepage, and search resources.',
        url: absolute('/.well-known/agent-skills/blog-discovery/SKILL.md'),
        digest: `sha256:${digest}`
      }
    ]
  }, {
    headers: discoveryHeaders()
  })
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: discoveryHeaders()
  })
}
