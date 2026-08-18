/**
 * Astro only dests `_middleware` at on-demand API routes. Public pages are
 * prerendered under /site/{region}/{locale} and must be fetched by that
 * function. `rewrite()` is a no-op here: Vercel treats `_middleware` as the
 * terminal handler, so an empty rewrite Response becomes a blank 200.
 *
 * Route order:
 * 1. 404 `/site/**` unless the internal fetch header is present
 * 2. filesystem (serves `/site/**` to that fetch, plus assets)
 * 3. dest `_middleware` for public HTML/JSON/XML routes
 */

export const INTERNAL_VARIANT_HEADER = 'x-somnium-internal'
export const INTERNAL_VARIANT_QUERY = '__somnium'

export const POLICY_ROUTER_DEST_SRC =
  '^/(?!site/|_astro/|_server-islands|_image|api/|scripts/|fonts/|\\.well-known/|favicon\\.ico$|favicon\\.png$|robots\\.txt$|manifest\\.webmanifest$).*$'

const VARIANT_404_DESTS = [
  ['mainland', 'zh-CN'],
  ['mainland', 'en'],
  ['global', 'zh-CN'],
  ['global', 'en']
] as const

export interface VercelOutputRoute {
  src?: string
  dest?: string
  handle?: string
  status?: number
  continue?: boolean
  middlewarePath?: string
  headers?: Record<string, string>
  missing?: Array<{ type: string, key: string, value?: string }>
}

export interface VercelOutputConfig {
  version?: number
  routes?: VercelOutputRoute[]
  [key: string]: unknown
}

function isPolicyDestRoute(route: VercelOutputRoute | undefined) {
  return Boolean(
    route
    && route.dest === '_middleware'
    && route.src === POLICY_ROUTER_DEST_SRC
  )
}

function isLegacyMiddlewareRoute(route: VercelOutputRoute | undefined) {
  return Boolean(
    route
    && route.middlewarePath === '_middleware'
    && route.continue === true
  )
}

function isDirectSiteBlockRoute(route: VercelOutputRoute | undefined) {
  return Boolean(
    route
    && route.src === '^/site(?:/.*)?$'
    && route.status === 404
  )
}

function isVariantNotFoundRoute(route: VercelOutputRoute | undefined) {
  return Boolean(
    route
    && typeof route.src === 'string'
    && route.src.startsWith('^/site/')
    && typeof route.dest === 'string'
    && route.dest.endsWith('/404')
    && route.status === 404
  )
}

export function matchesPolicyRouterDest(pathname: string) {
  return new RegExp(POLICY_ROUTER_DEST_SRC).test(pathname)
}

export function attachPolicyRouterMiddleware(config: VercelOutputConfig = {}) {
  const routes: VercelOutputRoute[] = Array.isArray(config.routes) ? config.routes.filter(route => (
    !isPolicyDestRoute(route)
    && !isLegacyMiddlewareRoute(route)
    && !isDirectSiteBlockRoute(route)
    && !isVariantNotFoundRoute(route)
  )) : []

  const blockDirectSite: VercelOutputRoute = {
    src: '^/site(?:/.*)?$',
    missing: [
      { type: 'header', key: INTERNAL_VARIANT_HEADER },
      { type: 'query', key: INTERNAL_VARIANT_QUERY, value: '1' }
    ],
    status: 404
  }
  const destRoute: VercelOutputRoute = {
    src: POLICY_ROUTER_DEST_SRC,
    dest: '_middleware'
  }
  const fallbacks: VercelOutputRoute[] = VARIANT_404_DESTS.map(([region, locale]) => ({
    src: `^/site/${region}/${locale}/.+$`,
    dest: `/site/${region}/${locale}/404`,
    status: 404
  }))

  routes.unshift(blockDirectSite)

  const filesystemIndex = routes.findIndex(route => route && route.handle === 'filesystem')
  const insertAt = filesystemIndex === -1 ? routes.length : filesystemIndex + 1
  routes.splice(insertAt, 0, ...fallbacks, destRoute)

  return {
    ...config,
    version: config.version ?? 3,
    routes
  }
}
