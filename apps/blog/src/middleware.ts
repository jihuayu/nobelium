import { defineMiddleware } from 'astro:middleware'
import { next as vercelNext, rewrite as vercelRewrite } from '@vercel/functions/middleware'
import { policyManifest } from './generated/policy-manifest'
import {
  INTERNAL_VARIANT_HEADER,
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

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.isPrerendered) {
    return next()
  }

  const url = new URL(context.request.url)
  const onVercelEdge = isVercelEdge(context.locals)
  const decision = decidePolicyRouter({
    pathname: url.pathname,
    search: url.search,
    country: context.request.headers.get('x-vercel-ip-country') || url.searchParams.get('__country'),
    regionParam: url.searchParams.get('__region'),
    cookie: context.request.headers.get('cookie'),
    acceptLanguage: context.request.headers.get('accept-language'),
    accept: context.request.headers.get('accept'),
    allowInternalVariants: !onVercelEdge && context.request.headers.get(INTERNAL_VARIANT_HEADER) === '1',
    manifest: policyManifest
  })

  switch (decision.type) {
    case 'bypass':
      if (onVercelEdge && !url.pathname.startsWith('/api/')) {
        return vercelNext()
      }
      return next()
    case 'allow-internal':
      return next()
    case 'block-direct-variant':
      return new Response(null, { status: 404 })
    case 'redirect': {
      const target = new URL(decision.location, url)
      return context.redirect(target, decision.status)
    }
    case 'rewrite': {
      const target = new URL(decision.pathname, url)
      target.search = url.search
      if (onVercelEdge) {
        return vercelRewrite(target, decision.status
          ? { status: decision.status, headers: decision.headers }
          : { headers: decision.headers })
      }

      const rewritten = await context.rewrite(new Request(target, {
        method: context.request.method,
        headers: withInternalHeader(context.request.headers)
      }))
      if (rewritten.status === 404 && decision.status !== 404) {
        const notFoundTarget = new URL(decision.notFoundPathname, url)
        notFoundTarget.search = url.search
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
