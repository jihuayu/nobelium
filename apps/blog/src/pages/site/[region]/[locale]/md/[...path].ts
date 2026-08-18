import type { APIRoute } from 'astro'
import { getAllVariants } from '@blog/lib/variants'
import { filterGroupsForVariant, loadTranslationGroups } from '@blog/lib/policy-content'
import { renderVariantMarkdown } from '@blog/lib/agent-markdown'
import { config } from '@/lib/server/config'
import type { Locale, RegionPolicy } from '@jihuayu/site-policy'

export async function getStaticPaths() {
  const [pages, posts] = await Promise.all([
    loadTranslationGroups(true),
    loadTranslationGroups(false)
  ])
  const paths = []

  for (const { region, locale } of getAllVariants()) {
    const variantPosts = filterGroupsForVariant(posts, region, locale)
    const variantPages = filterGroupsForVariant(pages, region, locale)
    const totalPages = Math.max(1, Math.ceil(variantPosts.length / Math.max(1, config.postsPerPage)))

    for (const group of variantPages) {
      paths.push({ params: { region, locale, path: group.contentKey } })
    }

    for (let page = 2; page <= totalPages; page += 1) {
      paths.push({ params: { region, locale, path: `page/${page}` } })
    }

    const tags = new Set<string>()
    for (const group of variantPosts) {
      for (const tag of group.translations[locale]?.tags || []) tags.add(tag)
    }
    for (const tag of tags) {
      paths.push({ params: { region, locale, path: `tag/${tag}` } })
    }

    paths.push({ params: { region, locale, path: 'search' } })
  }

  return paths
}

export const GET: APIRoute = async ({ params }) => {
  const { region, locale, path } = params as { region: RegionPolicy, locale: Locale, path: string }
  const body = await renderVariantMarkdown(`/${path}`, region, locale)
  if (!body) return new Response('Not found', { status: 404 })
  return new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
  })
}
