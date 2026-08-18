import { defineMiddleware } from 'astro:middleware'
import {
  canAccessArticle,
  lookupManifestArticle,
  lookupManifestRoute,
  resolveLocale,
  resolveRegionPolicy,
  type RegionPolicy
} from '@jihuayu/site-policy'
import { policyManifest } from './generated/policy-manifest'
import { variantBasePath } from './lib/variants'
import { shouldBypassPolicyRouter, withResponseHeaders } from './lib/policy-router'

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') return '/'
  return pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname
}

function wantsMarkdown(request: Request): boolean {
  const accept = request.headers.get('accept') || ''
  return accept.includes('text/markdown')
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.isPrerendered) {
    return next()
  }

  const url = new URL(context.request.url)
  const pathname = url.pathname

  if (shouldBypassPolicyRouter(pathname)) {
    return next()
  }

  if (pathname.startsWith('/site/')) {
    return new Response(null, { status: 404 })
  }

  const country = context.request.headers.get('x-vercel-ip-country')
    || url.searchParams.get('__country')
    || undefined
  const regionParam = url.searchParams.get('__region')
  const region: RegionPolicy = regionParam === 'mainland' || regionParam === 'global'
    ? regionParam
    : resolveRegionPolicy(country)

  const { locale, restPath } = resolveLocale({
    pathname,
    cookie: context.request.headers.get('cookie'),
    acceptLanguage: context.request.headers.get('accept-language')
  })

  if ((pathname === '/' || pathname === '') && locale === 'en') {
    const target = new URL('/en/', url)
    target.search = url.search
    return context.redirect(target, 307)
  }

  const policyHeaders = {
    'x-somnium-region': region,
    'x-somnium-locale': locale
  }

  const routeKey = normalizePathname(pathname)
  const route = lookupManifestRoute(policyManifest, routeKey)
  if (route) {
    const article = lookupManifestArticle(policyManifest, route.key)
    const missingLocale = article && locale === 'en' && !article.translations.en
    const blocked = article && !canAccessArticle(article, region)
    if (blocked || missingLocale) {
      const notFound = await context.rewrite(new URL(`${variantBasePath(region, locale)}/404`, url))
      return withResponseHeaders(notFound, policyHeaders, 404)
    }
  }

  let internalPath = restPath === '/' ? '' : restPath
  if (wantsMarkdown(context.request)) {
    internalPath = restPath === '/' ? '/markdown' : `/md${restPath}`
  }

  const rewriteTarget = `${variantBasePath(region, locale)}${internalPath || '/'}`
  const response = await context.rewrite(new URL(rewriteTarget, url))
  if (response.status === 404) {
    const notFound = await context.rewrite(new URL(`${variantBasePath(region, locale)}/404`, url))
    return withResponseHeaders(notFound, policyHeaders, 404)
  }

  return withResponseHeaders(response, policyHeaders)
})
