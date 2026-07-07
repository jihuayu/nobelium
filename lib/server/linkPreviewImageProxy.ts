import { ONE_DAY_SECONDS } from '@/lib/server/cache'
import { normalizeHttpUrl } from '@/lib/server/url'

const OG_PROXY_IMAGE_HOSTNAME = 'og-proxy.raw2.cc'
const OG_PROXY_IMAGE_PATHNAME = '/proxy/image'
const OG_PROXY_IMAGE_BASE_URL = `https://${OG_PROXY_IMAGE_HOSTNAME}${OG_PROXY_IMAGE_PATHNAME}`
const OG_PROXY_IMAGE_TRANSFORM_PARAMS = ['q', 'f', 'fit']

interface LinkPreviewImageProxyRule {
  id: string
  match: (url: URL) => boolean
  referer?: string
  cacheTtlSeconds?: number
}

const DOUBAN_IMAGE_HOSTS = new Set([
  'img1.doubanio.com',
  'img2.doubanio.com',
  'img3.doubanio.com'
])

function isHttpsHostAllowed(url: URL, hosts: Set<string>): boolean {
  return url.protocol === 'https:' && hosts.has(url.hostname.toLowerCase())
}

const IMAGE_PROXY_RULES: LinkPreviewImageProxyRule[] = [
  {
    id: 'douban',
    match: (url: URL) =>
      isHttpsHostAllowed(url, DOUBAN_IMAGE_HOSTS) &&
      url.pathname.startsWith('/'),
    referer: 'https://book.douban.com/',
    cacheTtlSeconds: ONE_DAY_SECONDS
  }
]

export function resolveLinkPreviewImageProxy(rawUrl: string): {
  normalizedUrl: string
  rule: {
    id: string
    referer: string
    cacheTtlSeconds: number
  }
} | null {
  const parsed = normalizeHttpUrl(rawUrl)
  if (!parsed) return null

  for (const rule of IMAGE_PROXY_RULES) {
    if (rule.match(parsed)) {
      return {
        normalizedUrl: parsed.toString(),
        rule: {
          id: rule.id,
          referer: rule.referer || '',
          cacheTtlSeconds: rule.cacheTtlSeconds || ONE_DAY_SECONDS
        }
      }
    }
  }
  return null
}

export function isLinkPreviewImageWhitelisted(rawUrl: string): boolean {
  const parsed = normalizeHttpUrl(rawUrl)
  if (!parsed) return false
  return IMAGE_PROXY_RULES.some(rule => rule.match(parsed))
}

export function toLinkPreviewImageProxyUrl(rawImageUrl: string, referer = ''): string {
  const parsed = normalizeHttpUrl(rawImageUrl)
  if (!parsed) return rawImageUrl

  if (parsed.hostname === OG_PROXY_IMAGE_HOSTNAME && parsed.pathname === OG_PROXY_IMAGE_PATHNAME) {
    for (const param of OG_PROXY_IMAGE_TRANSFORM_PARAMS) {
      parsed.searchParams.delete(param)
    }
    return parsed.toString()
  }

  const proxyUrl = new URL(OG_PROXY_IMAGE_BASE_URL)
  proxyUrl.searchParams.set('url', parsed.toString())
  if (referer) proxyUrl.searchParams.set('referer', referer)
  return proxyUrl.toString()
}
