import { buildLocalePath } from './locale'
import type {
  Locale,
  PolicyManifest,
  PolicyManifestArticle,
  PolicyManifestRoute,
  TranslationGroup
} from './types'

function normalizeRouteKey(pathname: string): string {
  if (!pathname || pathname === '/') return '/'
  return pathname.endsWith('/') && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname
}

export function buildPolicyManifest(groups: TranslationGroup[]): PolicyManifest {
  const routes: Record<string, PolicyManifestRoute> = {}
  const articles: Record<string, PolicyManifestArticle> = {}

  for (const group of groups) {
    const translations: Partial<Record<Locale, true>> = {}
    for (const locale of Object.keys(group.translations) as Locale[]) {
      if (!group.translations[locale]) continue
      translations[locale] = true

      const publicPath = buildLocalePath(`/${group.contentKey}`, locale)
      const routeKey = normalizeRouteKey(publicPath)
      routes[routeKey] = {
        key: group.contentKey,
        locale,
        internalPath: `/${group.contentKey}`
      }
    }

    articles[group.contentKey] = {
      visibility: group.policy.visibility,
      comments: group.policy.comments,
      translations
    }
  }

  return { routes, articles }
}

export function lookupManifestRoute(manifest: PolicyManifest, pathname: string): PolicyManifestRoute | null {
  const key = normalizeRouteKey(pathname)
  return manifest.routes[key] || null
}

export function lookupManifestArticle(manifest: PolicyManifest, contentKey: string): PolicyManifestArticle | null {
  return manifest.articles[contentKey] || null
}

export type { PolicyManifest, PolicyManifestRoute, PolicyManifestArticle }
