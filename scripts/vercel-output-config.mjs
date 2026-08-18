/**
 * Astro's Vercel adapter only dests Edge Middleware at on-demand routes
 * (API handlers). Policy routing lives on prerendered pages under /site/,
 * so the catch-all must run before `handle: filesystem` or `/` 404s.
 */

export const POLICY_ROUTER_MIDDLEWARE_SRC =
  '^/(?!_astro/|_server-islands|_image|api/|scripts/|fonts/|\\.well-known/|favicon\\.ico$|favicon\\.png$|robots\\.txt$|manifest\\.webmanifest$).*$'

const VARIANT_404_DESTS = [
  ['mainland', 'zh-CN'],
  ['mainland', 'en'],
  ['global', 'zh-CN'],
  ['global', 'en']
]

function isPolicyMiddlewareRoute(route) {
  return Boolean(
    route
    && route.middlewarePath === '_middleware'
    && route.continue === true
    && route.src === POLICY_ROUTER_MIDDLEWARE_SRC
  )
}

function isVariantNotFoundRoute(route) {
  return Boolean(
    route
    && typeof route.src === 'string'
    && route.src.startsWith('^/site/')
    && typeof route.dest === 'string'
    && route.dest.endsWith('/404')
    && route.status === 404
  )
}

export function matchesPolicyRouterMiddleware(pathname) {
  return new RegExp(POLICY_ROUTER_MIDDLEWARE_SRC).test(pathname)
}

export function attachPolicyRouterMiddleware(config) {
  const routes = Array.isArray(config?.routes) ? config.routes.filter(route => (
    !isPolicyMiddlewareRoute(route) && !isVariantNotFoundRoute(route)
  )) : []

  const middlewareRoute = {
    src: POLICY_ROUTER_MIDDLEWARE_SRC,
    middlewarePath: '_middleware',
    continue: true
  }

  const filesystemIndex = routes.findIndex(route => route && route.handle === 'filesystem')
  const insertAt = filesystemIndex === -1 ? 0 : filesystemIndex
  routes.splice(insertAt, 0, middlewareRoute)

  const afterFilesystem = routes.findIndex(route => route && route.handle === 'filesystem')
  const fallbackAt = afterFilesystem === -1 ? routes.length : afterFilesystem + 1
  const fallbacks = VARIANT_404_DESTS.map(([region, locale]) => ({
    src: `^/site/${region}/${locale}/.+$`,
    dest: `/site/${region}/${locale}/404`,
    status: 404
  }))
  routes.splice(fallbackAt, 0, ...fallbacks)

  return {
    ...config,
    version: config?.version ?? 3,
    routes
  }
}
