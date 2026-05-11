import { config } from '@/lib/server/config'
import { buildSiteAbsoluteUrl, buildSiteOrigin, buildSiteRelativePath } from '@/lib/server/sitemap'

export const dynamic = 'force-static'

export function GET() {
  const siteOrigin = buildSiteOrigin(config.link || '')
  const sitemap = buildSiteAbsoluteUrl(
    siteOrigin,
    buildSiteRelativePath(config.path || '', '/sitemap.xml')
  )

  const body = [
    'User-agent: *',
    'Allow: /',
    'Content-Signal: ai-train=no, search=yes, ai-input=no',
    '',
    `Host: ${siteOrigin}`,
    `Sitemap: ${sitemap}`,
    ''
  ].join('\n')

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}
