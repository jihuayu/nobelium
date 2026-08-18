import type { APIRoute } from 'astro'
import { getAllVariants } from '@blog/lib/variants'
import { renderVariantMarkdown } from '@blog/lib/agent-markdown'
import type { Locale, RegionPolicy } from '@jihuayu/site-policy'

export async function getStaticPaths() {
  return getAllVariants().map(({ region, locale }) => ({ params: { region, locale } }))
}

export const GET: APIRoute = async ({ params }) => {
  const { region, locale } = params as { region: RegionPolicy, locale: Locale }
  const body = await renderVariantMarkdown('/', region, locale)
  return new Response(body || '', {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
  })
}
