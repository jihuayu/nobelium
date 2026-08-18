import type { APIRoute } from 'astro'

export const prerender = false

export const GET: APIRoute = ({ request }) => {
  const country = `${request.headers.get('x-vercel-ip-country') || ''}`.trim().toUpperCase()
  return new Response(JSON.stringify({
    hideComments: country === 'CN',
    country: country || null
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-store'
    }
  })
}
