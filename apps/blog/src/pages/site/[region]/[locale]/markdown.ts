import type { APIRoute } from 'astro'
import { parseVariantParams } from '@blog/lib/variants'
import { renderVariantMarkdown } from '@blog/lib/agent-markdown'

export const prerender = false

export const GET: APIRoute = async ({ params }) => {
  const variant = parseVariantParams(params.region, params.locale)
  if (!variant) return new Response('Not found', { status: 404 })
  const body = await renderVariantMarkdown('/', variant.region, variant.locale)
  return new Response(body || '', {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
  })
}
