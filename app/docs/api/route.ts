const API_DOCS = String.raw`# Public API documentation

This is currently a static site and does not advertise any public API.

## Discovery

- API catalog: \`/.well-known/api-catalog\`
- OAuth protected resource metadata: \`/.well-known/oauth-protected-resource\`
- OAuth authorization server metadata: \`/.well-known/oauth-authorization-server\`
- OpenID Connect discovery metadata: \`/.well-known/openid-configuration\`

## Authentication

No authentication is required for the public static pages. OAuth/OIDC metadata is published as an empty/no-op declaration so automated agents can discover that no authorization server, grants, or scopes are advertised.
`

export const dynamic = 'force-static'

export function GET() {
  return new Response(API_DOCS, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}
