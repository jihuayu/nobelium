import type { APIRoute } from 'astro'
import { getAllVariants } from '@blog/lib/variants'
import { filterGroupsForVariant, getPostHref, loadTranslationGroups } from '@blog/lib/policy-content'
import { config } from '@/lib/server/config'
import { generateRssFeed } from '@jihuayu/notion-type/rss'
import type { Locale, RegionPolicy } from '@jihuayu/site-policy'

export async function getStaticPaths() {
  const groups = await loadTranslationGroups(false)
  return getAllVariants().map(({ region, locale }) => ({
    params: { region, locale },
    props: {
      groups: filterGroupsForVariant(groups, region, locale),
      locale
    }
  }))
}

export const GET: APIRoute = ({ props }) => {
  const { groups, locale } = props as { groups: Awaited<ReturnType<typeof loadTranslationGroups>>, locale: Locale }
  const siteUrl = config.link || 'https://blog.jihuayu.com'

  const feed = generateRssFeed({
    title: config.title,
    description: config.description,
    siteUrl,
    language: locale,
    items: groups.map(group => {
      const entry = group.translations[locale]!
      return {
        title: entry.title,
        description: entry.summary,
        link: new URL(getPostHref(group, locale), siteUrl).toString(),
        date: new Date(entry.date)
      }
    })
  })

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  })
}
