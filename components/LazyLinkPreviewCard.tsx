'use client'

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from 'react'
import cn from 'classnames'
import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/theme.stylex'
import type { LinkPreviewCardProps, LinkPreviewData } from '@jihuayu/notion-react'
import { normalizePreviewUrl } from '@/lib/link-preview/normalize'

const previewRequestCache = new Map<string, Promise<LinkPreviewData | null>>()
const OG_PROXY_IMAGE_URL = 'https://og-proxy.raw2.cc/proxy/image'
const OG_PROXY_IMAGE_HOSTNAME = 'og-proxy.raw2.cc'
const OG_PROXY_IMAGE_PATHNAME = '/proxy/image'
const OG_PROXY_IMAGE_TRANSFORM_PARAMS = ['q', 'f', 'fit']

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    return url
  }
}

function toOgProxyImageUrl(rawImageUrl: string, referer = ''): string {
  if (!rawImageUrl) return ''
  try {
    const parsed = new URL(rawImageUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return rawImageUrl
    if (parsed.hostname === OG_PROXY_IMAGE_HOSTNAME && parsed.pathname === OG_PROXY_IMAGE_PATHNAME) {
      for (const param of OG_PROXY_IMAGE_TRANSFORM_PARAMS) parsed.searchParams.delete(param)
      return parsed.toString()
    }
    const proxyUrl = new URL(OG_PROXY_IMAGE_URL)
    proxyUrl.searchParams.set('url', parsed.toString())
    if (referer) proxyUrl.searchParams.set('referer', referer)
    return proxyUrl.toString()
  } catch {
    return rawImageUrl
  }
}

function buildFallbackPreview(url: string): LinkPreviewData {
  const hostname = getHostname(url)
  const defaultIcon = hostname
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=32`
    : ''
  return {
    url,
    hostname,
    title: hostname || url,
    description: '',
    image: '',
    icon: toOgProxyImageUrl(defaultIcon, url)
  }
}

function loadPreview(url: string): Promise<LinkPreviewData | null> {
  const cached = previewRequestCache.get(url)
  if (cached) return cached

  const request = fetch(`/api/link-preview?${new URLSearchParams({ url }).toString()}`, {
    method: 'GET'
  })
    .then(async response => {
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload || typeof payload !== 'object') return null
      return payload as LinkPreviewData
    })
    .catch(() => null)

  previewRequestCache.set(url, request)
  return request
}

/**
 * EN: In-page bookmark card with lazy OG fetch. Keep the 110px horizontal layout; hover cards live in UrlMention.
 * ZH: 正文里的懒加载书签卡，保持 110px 横向布局。GitHub 风格只属于 UrlMention 悬浮预览。
 */
export default function LazyLinkPreviewCard({ url, className, preview }: LinkPreviewCardProps) {
  const hostRef = useRef<HTMLAnchorElement | null>(null)
  const normalizedUrl = normalizePreviewUrl(url) || ''
  const [remotePreviewState, setRemotePreviewState] = useState<{
    url: string
    preview: LinkPreviewData | null
  }>({ url: '', preview: null })
  const [imageFailed, setImageFailed] = useState(false)
  const remotePreview = remotePreviewState.url === normalizedUrl ? remotePreviewState.preview : null
  const fallback = buildFallbackPreview(normalizedUrl || url)
  const resolvedPreview = {
    ...fallback,
    ...(remotePreview || {}),
    ...(preview || {}),
    url: preview?.url || remotePreview?.url || normalizedUrl || fallback.url
  }

  const displayUrl = resolvedPreview.url || normalizedUrl
  const generatedImageUrl = displayUrl ? toOgProxyImageUrl(`${resolvedPreview.image || ''}`.trim(), displayUrl) : ''
  const iconUrl = displayUrl ? toOgProxyImageUrl(`${resolvedPreview.icon || ''}`.trim(), displayUrl) : ''
  const showImage = generatedImageUrl && !imageFailed

  useEffect(() => {
    if (preview || !normalizedUrl || !hostRef.current) return undefined

    let cancelled = false
    let idleTimer: ReturnType<typeof setTimeout> | null = null
    let idleId: number | null = null

    const activate = () => {
      void loadPreview(normalizedUrl).then(nextPreview => {
        if (!cancelled && nextPreview) {
          setRemotePreviewState({ url: normalizedUrl, preview: nextPreview })
        }
      })
    }

    const scheduleActivate = () => {
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        idleId = window.requestIdleCallback(activate, { timeout: 1200 })
      } else {
        idleTimer = globalThis.setTimeout(activate, 160)
      }
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some(entry => entry.isIntersecting)) return
      observer.disconnect()
      scheduleActivate()
    }, { root: null, rootMargin: '480px 0px', threshold: 0.01 })
    observer.observe(hostRef.current)

    return () => {
      cancelled = true
      observer.disconnect()
      if (idleId !== null && typeof window !== 'undefined' && window.cancelIdleCallback) {
        window.cancelIdleCallback(idleId)
      }
      if (idleTimer !== null) globalThis.clearTimeout(idleTimer)
    }
  }, [normalizedUrl, preview])

  if (!displayUrl) return null

  return (
    <a
      ref={hostRef}
      href={displayUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-link-preview-card="true"
      data-has-image={showImage ? 'true' : 'false'}
      className={cn(
        'link-preview-card',
        stylex.props(styles.card).className,
        className
      )}
      style={{ opacity: 1 }}
    >
      <div className={`link-preview-card-inner ${stylex.props(styles.inner).className}`}>
        <div className={cn('link-preview-card-main', stylex.props(styles.main, showImage ? styles.mainWithImage : styles.mainWithoutImage).className)}>
          <p {...stylex.props(styles.title)}>
            {resolvedPreview.title || resolvedPreview.hostname || displayUrl}
          </p>
          {resolvedPreview.description && (
            <p
              {...stylex.props(styles.description)}
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
            >
              {resolvedPreview.description}
            </p>
          )}
          <div {...stylex.props(styles.footer)}>
            {iconUrl
              ? (
                <span {...stylex.props(styles.iconFrame)}>
                  <img src={iconUrl} alt="" {...stylex.props(styles.icon)} loading="lazy" />
                </span>
                )
              : <span {...stylex.props(styles.iconPlaceholder)} />}
            <span {...stylex.props(styles.truncate)}>{displayUrl}</span>
          </div>
        </div>
        {showImage && (
          <div className={`link-preview-card-media ${stylex.props(styles.media).className}`}>
            <div {...stylex.props(styles.mediaFrame)}>
              <img
                src={generatedImageUrl}
                alt=""
                className={`link-preview-cover ${stylex.props(styles.cover).className}`}
                style={{ filter: 'none' }}
                loading="lazy"
                onError={() => setImageFailed(true)}
              />
            </div>
          </div>
        )}
      </div>
    </a>
  )
}

const styles = stylex.create({
  card: {
    backgroundColor: 'transparent',
    borderColor: {
      default: colors.borderDefault,
      ':hover': colors.borderStrong
    },
    borderRadius: '0.375rem',
    borderStyle: 'solid',
    borderWidth: '1px',
    display: 'block',
    height: '110px',
    marginBlock: '1rem',
    opacity: 1,
    overflow: 'hidden',
    transitionProperty: 'border-color'
  },
  inner: {
    alignItems: 'stretch',
    display: 'flex',
    height: '100%'
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    padding: '0.5rem 0.75rem'
  },
  mainWithImage: {
    flexBasis: '65%',
    flexShrink: 0
  },
  mainWithoutImage: {
    flex: 1
  },
  title: {
    color: colors.textPrimary,
    fontSize: '1rem',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  description: {
    color: colors.textMutedStrong,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    marginTop: '0.125rem',
    overflow: 'hidden'
  },
  footer: {
    alignItems: 'center',
    color: colors.textStrong,
    display: 'flex',
    fontSize: '0.75rem',
    gap: '0.5rem',
    marginTop: 'auto',
    paddingTop: '0.375rem'
  },
  iconFrame: {
    backgroundColor: 'transparent',
    borderRadius: '0.125rem',
    flex: 'none',
    height: '1rem',
    overflow: 'hidden',
    position: 'relative',
    width: '1rem'
  },
  icon: {
    backgroundColor: 'transparent',
    borderRadius: '0.125rem',
    height: '1rem',
    objectFit: 'contain',
    width: '1rem'
  },
  iconPlaceholder: {
    backgroundColor: colors.borderInput,
    borderRadius: '0.125rem',
    flex: 'none',
    height: '1rem',
    width: '1rem'
  },
  truncate: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  media: {
    flexBasis: '35%',
    flexShrink: 0,
    height: '100%'
  },
  mediaFrame: {
    backgroundColor: colors.surfaceSubtle,
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
    width: '100%'
  },
  cover: {
    height: '100%',
    objectFit: 'cover',
    pointerEvents: 'none',
    transitionDuration: '200ms',
    transitionProperty: 'opacity',
    width: '100%'
  }
})
