import type { APIRoute } from 'astro'
import { getAllVariants } from '@blog/lib/variants'
import { filterGroupsForVariant, getPostHref, loadTranslationGroups } from '@blog/lib/policy-content'
import type { Locale, RegionPolicy } from '@jihuayu/site-policy'

export async function getStaticPaths() {
  const groups = await loadTranslationGroups(false)
  return getAllVariants().map(({ region, locale }) => ({
    params: { region, locale },
    props: {
      entries: filterGroupsForVariant(groups, region, locale).map(group => {
        const entry = group.translations[locale as Locale]!
        return {
          title: entry.title,
          summary: entry.summary,
          tags: entry.tags,
          href: getPostHref(group, locale as Locale),
          date: entry.date
        }
      })
    }
  }))
}

export const GET: APIRoute = ({ props }) => {
  return new Response(JSON.stringify(props.entries), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  })
}
