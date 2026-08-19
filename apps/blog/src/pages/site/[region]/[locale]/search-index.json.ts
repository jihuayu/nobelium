import type { APIRoute } from 'astro'
import { parseVariantParams } from '@blog/lib/variants'
import { filterGroupsForVariant, getPostHref, loadTranslationGroups } from '@blog/lib/policy-content'

export const prerender = false

export const GET: APIRoute = async ({ params }) => {
  const variant = parseVariantParams(params.region, params.locale)
  if (!variant) return new Response('Not found', { status: 404 })

  const groups = filterGroupsForVariant(await loadTranslationGroups(false), variant.region, variant.locale)
  const entries = groups.map(group => {
    const entry = group.translations[variant.locale]!
    return {
      title: entry.title,
      summary: entry.summary,
      tags: entry.tags,
      href: getPostHref(group, variant.locale),
      date: entry.date
    }
  })

  return new Response(JSON.stringify(entries), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400'
    }
  })
}
