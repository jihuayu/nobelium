import type { APIRoute } from 'astro'
import { parseVariantParams } from '@blog/lib/variants'
import { renderVariantMarkdown } from '@blog/lib/agent-markdown'

export const prerender = false

function restPath(path: string | string[] | undefined): string {
  if (Array.isArray(path)) return path.join('/')
  return `${path || ''}`.replace(/^\/+|\/+$/g, '')
}

export const GET: APIRoute = async ({ params }) => {
  const variant = parseVariantParams(params.region, params.locale)
  const path = restPath(params.path)
  if (!variant || !path) return new Response('Not found', { status: 404 })
  const body = await renderVariantMarkdown(`/${path}`, variant.region, variant.locale)
  if (!body) return new Response('Not found', { status: 404 })
  return new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
  })
}
