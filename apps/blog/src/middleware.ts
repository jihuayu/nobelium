import { defineMiddleware } from 'astro:middleware'
import {
  canAccessArticle,
  lookupManifestArticle,
  lookupManifestRoute,
  resolveLocale,
  resolveRegionPolicy
} from '@jihuayu/site-policy'
import { policyManifest } from './generated/policy-manifest'
import { variantBasePath } from './lib/variants'

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') return '/'
  return pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.isPrerendered) {
    return next()
  }

  const url = new URL(context.request.url)
  const pathname = url.pathname

  if (pathname.startsWith('/site/')) {
    return new Response(null, { status: 404 })
  }

  const country = context.request.headers.get('x-vercel-ip-country')
    || url.searchParams.get('__country')
    || undefined
  const region = url.searchParams.get('__region') === 'mainland' || url.searchParams.get('__region') === 'global'
    ? url.searchParams.get('__region')!
    : resolveRegionPolicy(country)

  const { locale, explicit, restPath } = resolveLocale({
    pathname,
    cookie: context.request.headers.get('cookie'),
    acceptLanguage: context.request.headers.get('accept-language')
  })

  if ((pathname === '/' || pathname === '') && !explicit && locale === 'en') {
    return context.redirect('/en/', 307)
  }

  const routeKey = normalizePathname(pathname)
  const route = lookupManifestRoute(policyManifest, routeKey)
  if (route) {
    const article = lookupManifestArticle(policyManifest, route.key)
    if (article && !canAccessArticle(article, region as 'mainland' | 'global')) {
      return new Response(null, { status: 404 })
    }
    if (article && locale === 'en' && !article.translations.en) {
      return new Response(null, { status: 404 })
    }
  }

  const internalPath = restPath === '/' ? '' : restPath
  const rewriteTarget = `${variantBasePath(region as 'mainland' | 'global', locale)}${internalPath}`
  return context.rewrite(new URL(rewriteTarget, url))
})
