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

function metadata() {
  const issuer = buildSiteOrigin(config.link || '')
  return {
    issuer,
    authorization_endpoint: absolute('/.well-known/oauth/authorize'),
    token_endpoint: absolute('/.well-known/oauth/token'),
    jwks_uri: absolute('/.well-known/jwks.json'),
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: ['read:public'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    service_documentation: absolute('/docs/api')
  }
}

export function GET() {
  return NextResponse.json(metadata(), {
    headers: { 'Cache-Control': 'public, max-age=3600' }
  })
}