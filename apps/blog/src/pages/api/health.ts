import type { APIRoute } from 'astro'

export const prerender = false

export const GET: APIRoute = () => {
  return new Response(JSON.stringify({ status: 'ok', service: 'blog-public-api' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60'
    }
  })
}
