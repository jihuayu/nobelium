import { unstable_cache } from 'next/cache'
import type { LinkPreviewData } from '@/lib/link-preview/types'
import { normalizePreviewUrl } from '@/lib/link-preview/normalize'
import { getHostnameFromUrl } from '@/lib/server/url'
import { ONE_DAY_SECONDS } from '@/lib/server/cache'
import { config } from '@/lib/server/config'
import { warnServerError } from '@/lib/server/logging'
import {
  buildOgProxyApiUrl as buildOgProxyApiUrlWithBase,
  mapOgProxyPayloadToPreview,
  normalizeConfiguredUrl
} from '@/lib/server/linkPreviewShared'

export { normalizePreviewUrl } from '@/lib/link-preview/normalize'

const LINK_PREVIEW_CACHE_REVALIDATE_SECONDS = ONE_DAY_SECONDS

function getOgProxyConfig(): { enabled: boolean, baseUrl: string } {
  const useOgProxy = Boolean(config.linkPreview?.useOgProxy)
  const baseUrl = normalizeConfiguredUrl(config.linkPreview?.ogProxyBaseUrl || '')

  return {
    enabled: useOgProxy && Boolean(baseUrl),
    baseUrl
  }
}

export function buildOgProxyApiUrl(normalizedUrl: string): string | null {
  const { enabled, baseUrl } = getOgProxyConfig()
  if (!enabled || !normalizedUrl) return null
  return buildOgProxyApiUrlWithBase(baseUrl, normalizedUrl)
}

function createFallback(url: string): LinkPreviewData {
  const hostname = getHostnameFromUrl(url)
  return {
    url,
    hostname,
    title: hostname || url,
    description: '',
    image: '',
    icon: ''
  }
}

async function fetchLinkPreviewViaOgProxy(normalizedUrl: string, fallback: LinkPreviewData): Promise<LinkPreviewData | null> {
  const apiUrl = buildOgProxyApiUrl(normalizedUrl)
  if (!apiUrl) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      return null
    }

    const payload = await response.json()
    return mapOgProxyPayloadToPreview(normalizedUrl, fallback, payload)
  } catch (error) {
    warnServerError('link-preview:og-proxy', error, { normalizedUrl })
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchLinkPreview(normalizedUrl: string): Promise<LinkPreviewData> {
  const fallback = createFallback(normalizedUrl)
  const proxied = await fetchLinkPreviewViaOgProxy(normalizedUrl, fallback)
  return proxied || fallback
}

const getCachedLinkPreview = unstable_cache(
  async (normalizedUrl: string): Promise<LinkPreviewData> => fetchLinkPreview(normalizedUrl),
  ['link-preview-metadata-v7'],
  {
    revalidate: LINK_PREVIEW_CACHE_REVALIDATE_SECONDS,
    tags: ['link-preview-metadata']
  }
)

export async function getLinkPreviewByNormalizedUrl(normalizedUrl: string): Promise<LinkPreviewData> {
  return getCachedLinkPreview(normalizedUrl)
}

export async function getLinkPreview(rawUrl: string): Promise<LinkPreviewData | null> {
  const normalizedUrl = normalizePreviewUrl(rawUrl)
  if (!normalizedUrl) return null
  return getLinkPreviewByNormalizedUrl(normalizedUrl)
}
