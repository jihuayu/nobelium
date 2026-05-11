import { NextResponse } from 'next/server'
import { config } from '@/lib/server/config'
import { buildSiteAbsoluteUrl, buildSiteOrigin, buildSiteRelativePath } from '@/lib/server/sitemap'

export const dynamic = 'force-static'

function absolute(path: string): string {
  return buildSiteAbsoluteUrl(
    buildSiteOrigin(config.link || ''),
    buildSiteRelativePath(config.path || '', path)
  )
}

export function GET() {
  return new NextResponse(JSON.stringify({
    linkset: [
      {
        anchor: absolute('/api/search'),
        'service-desc': [{ href: absolute('/.well-known/openapi.json'), type: 'application/openapi+json' }],
        'service-doc': [{ href: absolute('/docs/api'), type: 'text/markdown' }],
        status: [{ href: absolute('/api/health'), type: 'application/json' }]
      },
      {
        anchor: absolute('/api/tags'),
        'service-desc': [{ href: absolute('/.well-known/openapi.json'), type: 'application/openapi+json' }],
        'service-doc': [{ href: absolute('/docs/api'), type: 'text/markdown' }],
        status: [{ href: absolute('/api/health'), type: 'application/json' }]
      }
    ]
  }, null, 2), {
    headers: {
      'Content-Type': 'application/linkset+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}