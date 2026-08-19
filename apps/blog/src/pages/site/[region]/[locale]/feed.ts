import { parseVariantParams } from '@blog/lib/variants'
import { filterGroupsForVariant, getPostHref, loadTranslationGroups } from '@blog/lib/policy-content'
import { ISR_PAGE_CACHE_CONTROL } from '@blog/lib/isr-cache'
import { config } from '@/lib/server/config'
import { generateRssFeed } from '@jihuayu/notion-type/rss'
import type { APIRoute } from 'astro'

export const prerender = false

export const GET: APIRoute = async ({ params }) => {
  const variant = parseVariantParams(params.region, params.locale)
  if (!variant) return new Response('Not found', { status: 404 })

  const groups = filterGroupsForVariant(await loadTranslationGroups(false), variant.region, variant.locale)
  const siteUrl = config.link || 'https://blog.jihuayu.com'
  const feed = generateRssFeed({
    title: config.title,
    description: config.description,
    siteUrl,
    language: variant.locale,
    items: groups.map(group => {
      const entry = group.translations[variant.locale]!
      return {
        title: entry.title,
        description: entry.summary,
        link: new URL(getPostHref(group, variant.locale), siteUrl).toString(),
        date: new Date(entry.date)
      }
    })
  })
  return new Response(feed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': ISR_PAGE_CACHE_CONTROL
    }
  })
}
