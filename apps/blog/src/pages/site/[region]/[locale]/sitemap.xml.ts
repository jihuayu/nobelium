import type { APIRoute } from 'astro'
import { getAllVariants, buildPublicPath } from '@blog/lib/variants'
import { filterGroupsForVariant, getPostHref, loadTranslationGroups } from '@blog/lib/policy-content'
import { config } from '@/lib/server/config'
import { siteOrigin } from '@blog/lib/urls'
import type { Locale } from '@jihuayu/site-policy'

export async function getStaticPaths() {
  const [pages, posts] = await Promise.all([
    loadTranslationGroups(true),
    loadTranslationGroups(false)
  ])
  return getAllVariants().map(({ region, locale }) => ({
    params: { region, locale },
    props: {
      pages: filterGroupsForVariant(pages, region, locale),
      posts: filterGroupsForVariant(posts, region, locale),
      locale
    }
  }))
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export const GET: APIRoute = ({ props }) => {
  const { pages, posts, locale } = props as {
    pages: Awaited<ReturnType<typeof loadTranslationGroups>>
    posts: Awaited<ReturnType<typeof loadTranslationGroups>>
    locale: Locale
  }
  const origin = siteOrigin()
  const loc = (path: string) => xmlEscape(new URL(buildPublicPath(path, locale), `${origin}/`).toString())
  const urls: string[] = [
    loc('/'),
    loc('/search'),
    loc('/feed')
  ]

  const seen = new Set<string>()
  for (const group of [...pages, ...posts]) {
    const href = xmlEscape(new URL(getPostHref(group, locale), `${origin}/`).toString())
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
    for (const tag of group.translations[locale]?.tags || []) tags.add(tag)
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
      'Cache-Control': 'public, max-age=3600'
    }
  })
}
