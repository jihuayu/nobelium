import type { APIRoute } from 'astro'
import { buildPublicPath, parseVariantParams } from '@blog/lib/variants'
import { filterGroupsForVariant, getPostHref, loadTranslationGroups } from '@blog/lib/policy-content'
import { config } from '@/lib/server/config'
import { siteOrigin } from '@blog/lib/urls'
import { ISR_PAGE_CACHE_CONTROL } from '@blog/lib/isr-cache'

export const prerender = false

function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export const GET: APIRoute = async ({ params }) => {
  const variant = parseVariantParams(params.region, params.locale)
  if (!variant) return new Response('Not found', { status: 404 })

  const [pages, posts] = await Promise.all([
    filterGroupsForVariant(await loadTranslationGroups(true), variant.region, variant.locale),
    filterGroupsForVariant(await loadTranslationGroups(false), variant.region, variant.locale)
  ])
  const origin = siteOrigin()
  const loc = (path: string) => xmlEscape(new URL(buildPublicPath(path, variant.locale), `${origin}/`).toString())
  const urls: string[] = [
    loc('/'),
    loc('/search'),
    loc('/feed')
  ]

  const seen = new Set<string>()
  for (const group of [...pages, ...posts]) {
    const href = xmlEscape(new URL(getPostHref(group, variant.locale), `${origin}/`).toString())
    if (seen.has(href)) continue
    seen.add(href)
    urls.push(href)
  }

  const totalPages = Math.max(1, Math.ceil(posts.length / Math.max(1, config.postsPerPage)))
  for (let page = 2; page <= totalPages; page += 1) {
    urls.push(loc(`/page/${page}`))
  }

  const tags = new Set<string>()
  for (const group of posts) {
    for (const tag of group.translations[variant.locale]?.tags || []) tags.add(tag)
  }
  for (const tag of tags) {
    urls.push(loc(`/tag/${encodeURIComponent(tag)}`))
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url><loc>${url}</loc></url>`).join('\n')}
</urlset>
`
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': ISR_PAGE_CACHE_CONTROL
    }
  })
}
