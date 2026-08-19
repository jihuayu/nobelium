import { resolveLocale } from '@jihuayu/site-policy'
import { FIVE_MINUTES_SECONDS } from '@/lib/server/cache'
import { INTERNAL_VARIANT_HEADER, INTERNAL_VARIANT_QUERY } from './policy-router'
import { getAllVariants, variantBasePath } from './variants'

export const ISR_EXPIRATION_SECONDS = FIVE_MINUTES_SECONDS
export const ISR_REVALIDATE_HEADER = 'x-prerender-revalidate'

const COMPANION_REST_PATHS: Record<string, string[]> = {
  '/search': ['/search-index.json'],
  '/feed': ['/feed.xml']
}

export function getIsrBypassToken(): string {
  return (
    process.env.CACHE_REVALIDATE_TOKEN?.trim()
    || process.env.ISR_BYPASS_TOKEN?.trim()
    || process.env.REVALIDATE_TOKEN?.trim()
    || ''
  )
}

export function deploymentOrigin(request?: Request): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  if (request) return new URL(request.url).origin
  return process.env.SITE_URL?.trim() || 'https://blog.jihuayu.com'
}

function normalizePublicPath(pathname: string): string {
  const trimmed = `${pathname || ''}`.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export function expandPublicPathToInternalVariants(pathname: string): string[] {
  const normalized = normalizePublicPath(pathname)
  if (!normalized || normalized.includes('[') || normalized.includes(']')) return []

  const { restPath } = resolveLocale({ pathname: normalized })
  const rest = restPath === '/' || restPath === '' ? '' : restPath
  if (rest === '/api' || rest.startsWith('/api/')) return []

  const restPaths = [rest, ...(COMPANION_REST_PATHS[rest || '/'] || [])]

  return getAllVariants().flatMap(({ region, locale }) => {
    const base = variantBasePath(region, locale)
    return restPaths.map(item => item ? `${base}${item}` : base)
  })
}

export function expandPublicPathsToInternalVariants(paths: string[]): string[] {
  const seen = new Set<string>()
  for (const path of paths) {
    for (const internal of expandPublicPathToInternalVariants(path)) {
      seen.add(internal)
    }
  }
  return Array.from(seen)
}

export async function revalidateInternalPaths(
  origin: string,
  publicPaths: string[],
  bypassToken = getIsrBypassToken()
): Promise<Array<{ path: string, status: number | null, ok: boolean, error?: string }>> {
  if (!bypassToken) {
    return publicPaths.map(path => ({ path, status: null, ok: false, error: 'missing-bypass-token' }))
  }

  const internals = expandPublicPathsToInternalVariants(publicPaths)
  const results = await Promise.all(internals.map(async (path) => {
    try {
      const url = new URL(path, origin)
      url.searchParams.set(INTERNAL_VARIANT_QUERY, '1')
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          [ISR_REVALIDATE_HEADER]: bypassToken,
          [INTERNAL_VARIANT_HEADER]: '1'
        }
      })
      await response.arrayBuffer()
      return { path, status: response.status, ok: response.ok }
    } catch (error) {
      return { path, status: null, ok: false, error: `${error}` }
    }
  }))
  return results
}
