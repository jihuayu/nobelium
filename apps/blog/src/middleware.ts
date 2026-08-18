import { defineMiddleware } from 'astro:middleware'
import { policyManifest } from './generated/policy-manifest'
import { LOCALE_COOKIE_NAME } from '@jihuayu/site-policy'
import {
  INTERNAL_VARIANT_HEADER,
  INTERNAL_VARIANT_QUERY,
  copyStaticResponse,
  decidePolicyRouter,
  withResponseHeaders
} from './lib/policy-router'

function isVercelEdge(locals: unknown): boolean {
  return Boolean(
    locals
    && typeof locals === 'object'
    && 'vercel' in locals
    && (locals as { vercel?: { edge?: unknown } }).vercel?.edge
  )
}

function withInternalHeader(headers: Headers): Headers {
  const nextHeaders = new Headers(headers)
  nextHeaders.set(INTERNAL_VARIANT_HEADER, '1')
  return nextHeaders
}

async function fetchPrerenderedPage(target: URL, request: Request): Promise<Response> {
  const headers = new Headers()
  headers.set(INTERNAL_VARIANT_HEADER, '1')
  const accept = request.headers.get('accept')
  if (accept) headers.set('accept', accept)

  const candidates: URL[] = [target]
  if (!/\.(html|xml|json|txt|md)$/i.test(target.pathname)) {
    const withIndex = new URL(target)
    withIndex.pathname = `${target.pathname.replace(/\/$/, '')}/index.html`
    candidates.push(withIndex)
  }

  for (const candidate of candidates) {
    candidate.searchParams.set(INTERNAL_VARIANT_QUERY, '1')
  }

  let last: Response = new Response(null, { status: 404 })
  for (const url of candidates) {
    last = await fetch(url, { method: 'GET', headers, redirect: 'manual' })
    if (last.status >= 300 && last.status < 400) {
      const location = last.headers.get('location')
      if (location) {
        const redirected = new URL(location, url)
        if (redirected.origin === url.origin) {
          redirected.searchParams.set(INTERNAL_VARIANT_QUERY, '1')
          last = await fetch(redirected, { method: 'GET', headers, redirect: 'manual' })
        }
      }
    }
    if (last.ok) return last
  }
  return last
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.isPrerendered) {
    return next()
  }

  const url = new URL(context.request.url)
  const onVercelEdge = isVercelEdge(context.locals) || Boolean(process.env.VERCEL)
  const decision = decidePolicyRouter({
    pathname: url.pathname,
    search: url.search,
    country: context.request.headers.get('x-vercel-ip-country') || url.searchParams.get('__country'),
    regionParam: url.searchParams.get('__region'),
    cookie: context.request.headers.get('cookie'),
    acceptLanguage: context.request.headers.get('accept-language'),
    accept: context.request.headers.get('accept'),
    allowInternalVariants: context.request.headers.get(INTERNAL_VARIANT_HEADER) === '1',
    manifest: policyManifest
  })

  switch (decision.type) {
    case 'bypass':
    case 'allow-internal':
      return next()
    case 'block-direct-variant':
      return new Response(null, { status: 404 })
    case 'redirect': {
      const target = new URL(decision.location, url)
      const headers = new Headers({ Location: target.toString() })
      if (decision.persistLocale) {
        const secure = url.protocol === 'https:' ? '; Secure' : ''
        headers.append(
          'Set-Cookie',
          `${LOCALE_COOKIE_NAME}=${decision.persistLocale}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`
        )
        headers.append(
          'Set-Cookie',
          `${LOCALE_COOKIE_NAME}=; Path=/en; Max-Age=0; SameSite=Lax${secure}`
        )
      }
      return new Response(null, { status: decision.status, headers })
    }
    case 'rewrite': {
      const target = new URL(decision.pathname, url)
      if (onVercelEdge) {
        let origin = await fetchPrerenderedPage(target, context.request)
        if (!origin.ok && decision.status !== 404) {
          origin = await fetchPrerenderedPage(new URL(decision.notFoundPathname, url), context.request)
          return copyStaticResponse(origin, decision.headers, 404)
        }
        return copyStaticResponse(origin, decision.headers, decision.status ?? origin.status)
      }

      const rewritten = await context.rewrite(new Request(target, {
        method: context.request.method,
        headers: withInternalHeader(context.request.headers)
      }))
      if (rewritten.status === 404 && decision.status !== 404) {
        const notFoundTarget = new URL(decision.notFoundPathname, url)
        const notFound = await context.rewrite(new Request(notFoundTarget, {
          method: context.request.method,
          headers: withInternalHeader(context.request.headers)
        }))
        return withResponseHeaders(notFound, decision.headers, 404)
      }
      return withResponseHeaders(rewritten, decision.headers, decision.status ?? rewritten.status)
    }
    default: {
      const exhaustive: never = decision
      throw new Error(`Unhandled policy router decision: ${JSON.stringify(exhaustive)}`)
    }
  }
})
