import { NextResponse } from 'next/server'
import { config } from '@/lib/server/config'
import { buildSiteOrigin } from '@/lib/server/sitemap'

export const dynamic = 'force-static'

export function GET() {
  return NextResponse.json({
    resource: buildSiteOrigin(config.link || ''),
    authorization_servers: [],
    scopes_supported: []
  }, {
    headers: { 'Cache-Control': 'public, max-age=3600' }
  })
}
