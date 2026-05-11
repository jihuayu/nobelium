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
  return NextResponse.json({
    openapi: '3.1.0',
    info: {
      title: `${config.title} public API`,
      version: '1.0.0',
      description: 'Public read-only endpoints for blog search, tags, feed, and agent discovery.'
    },
    servers: [{ url: buildSiteOrigin(config.link || '') }],
    paths: {
      '/api/search': {
        get: {
          summary: 'Search published blog posts',
          parameters: [
            { name: 'q', in: 'query', required: true, schema: { type: 'string', minLength: 1 } },
            { name: 'tag', in: 'query', required: false, schema: { type: 'string' } },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 } }
          ],
          responses: { '200': { description: 'Search results' } }
        }
      },
      '/api/tags': {
        get: {
          summary: 'List published blog tags',
          responses: { '200': { description: 'Tag counts keyed by tag name' } }
        }
      },
      '/api/health': {
        get: {
          summary: 'Health check',
          responses: { '200': { description: 'Service health' } }
        }
      },
      '/feed': {
        get: {
          summary: 'RSS feed',
          responses: { '200': { description: 'RSS XML feed' } }
        }
      }
    },
    externalDocs: {
      description: 'API documentation',
      url: absolute('/docs/api')
    }
  }, {
    headers: {
      'Content-Type': 'application/openapi+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}