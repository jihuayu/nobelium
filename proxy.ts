import { NextRequest, NextResponse } from 'next/server'
import { AGENT_DISCOVERY_LINK_HEADER } from '@/lib/agent-discovery'

function acceptsMarkdown(request: NextRequest): boolean {
  const accept = request.headers.get('accept') || ''
  return /(?:^|,)\s*text\/markdown\s*(?:;|,|$)/i.test(accept)
}

function isHtmlPagePath(pathname: string): boolean {
  if (pathname.startsWith('/api/')) return false
  if (pathname.startsWith('/_next/')) return false
  if (pathname.startsWith('/.well-known/')) return false
  if (pathname === '/feed') return false
  if (/\.[^/]+$/.test(pathname)) return false
  return true
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!isHtmlPagePath(pathname)) {
    return NextResponse.next()
  }

  if (acceptsMarkdown(request)) {
    const url = request.nextUrl.clone()
    url.pathname = `/.well-known/home.md${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url, {
      headers: {
        Link: AGENT_DISCOVERY_LINK_HEADER
      }
    })
  }

  const response = NextResponse.next()
  response.headers.set('Link', AGENT_DISCOVERY_LINK_HEADER)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
