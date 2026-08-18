import {
  canAccessArticle,
  lookupManifestArticle,
  lookupManifestRoute,
  resolveLocale,
  resolveRegionPolicy,
  type PolicyManifest,
  type RegionPolicy
} from '@jihuayu/site-policy'
import { variantBasePath } from './variants'

export const INTERNAL_VARIANT_HEADER = 'x-somnium-internal'
export const INTERNAL_VARIANT_QUERY = '__somnium'

const BYPASS_PREFIXES = ['/_astro/', '/scripts/', '/fonts/', '/api/', '/.well-known/']
const BYPASS_EXACT = new Set(['/favicon.ico', '/favicon.png', '/robots.txt', '/manifest.webmanifest'])

export function shouldBypassPolicyRouter(pathname: string): boolean {
  if (BYPASS_EXACT.has(pathname)) return true
  return BYPASS_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

export function withResponseHeaders(
  response: Response,
  headers: Record<string, string>,
  status = response.status
): Response {
  const nextHeaders = new Headers(response.headers)
  for (const [key, value] of Object.entries(headers)) nextHeaders.set(key, value)
  return new Response(response.body, {
    status,
    statusText: status === 404 ? 'Not Found' : response.statusText,
    headers: nextHeaders
  })
}

export function copyStaticResponse(
  origin: Response,
  extraHeaders: Record<string, string>,
  status = origin.status
): Response {
  const headers = new Headers()
  const contentType = origin.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)
  for (const [key, value] of Object.entries(extraHeaders)) headers.set(key, value)
  return new Response(origin.body, {
    status,
    statusText: status === 404 ? 'Not Found' : origin.statusText,
    headers
  })
}

export function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') return '/'
  return pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname
}

export function wantsMarkdown(accept: string | null | undefined): boolean {
  return (accept || '').includes('text/markdown')
}

export type PolicyRouterDecision =
  | { type: 'bypass' }
  | { type: 'allow-internal' }
  | { type: 'block-direct-variant' }
  | { type: 'redirect'; location: string; status: 307 }
  | {
    type: 'rewrite'
    pathname: string
    notFoundPathname: string
    status?: number
    headers: Record<string, string>
  }

export interface DecidePolicyRouterInput {
  pathname: string
  search?: string
  country?: string | null
  regionParam?: string | null
  cookie?: string | null
  acceptLanguage?: string | null
  accept?: string | null
  allowInternalVariants?: boolean
  manifest: PolicyManifest
}

function resolveRegion(input: DecidePolicyRouterInput): RegionPolicy {
  if (input.regionParam === 'mainland' || input.regionParam === 'global') {
    return input.regionParam
  }
  return resolveRegionPolicy(input.country)
}

function variantPath(region: RegionPolicy, locale: 'zh-CN' | 'en', restPath: string): string {
  const base = variantBasePath(region, locale)
  const rest = restPath === '/' || restPath === '' ? '' : restPath
  return normalizePathname(`${base}${rest}`)
}

export function decidePolicyRouter(input: DecidePolicyRouterInput): PolicyRouterDecision {
  const pathname = input.pathname || '/'

  if (shouldBypassPolicyRouter(pathname)) {
    return { type: 'bypass' }
  }

  if (pathname.startsWith('/site/')) {
    if (input.allowInternalVariants) return { type: 'allow-internal' }
    return { type: 'block-direct-variant' }
  }

  const region = resolveRegion(input)
  const { locale, restPath } = resolveLocale({
    pathname,
    cookie: input.cookie,
    acceptLanguage: input.acceptLanguage
  })

  if ((pathname === '/' || pathname === '') && locale === 'en') {
    const search = input.search || ''
    return { type: 'redirect', location: `/en/${search}`, status: 307 }
  }

  const headers = {
    'x-somnium-region': region,
    'x-somnium-locale': locale
  }
  const notFoundPathname = variantPath(region, locale, '/404')

  const route = lookupManifestRoute(input.manifest, pathname)
  if (route) {
    const article = lookupManifestArticle(input.manifest, route.key)
    const missingLocale = Boolean(article && locale === 'en' && !article.translations.en)
    const blocked = Boolean(article && !canAccessArticle(article, region))
    if (blocked || missingLocale) {
      return { type: 'rewrite', pathname: notFoundPathname, notFoundPathname, status: 404, headers }
    }
  }

  let internalPath = restPath === '/' ? '' : restPath
  if (wantsMarkdown(input.accept)) {
    internalPath = restPath === '/' || restPath === '' ? '/markdown' : `/md${restPath}`
  }

  return {
    type: 'rewrite',
    pathname: variantPath(region, locale, internalPath || '/'),
    notFoundPathname,
    headers
  }
}
