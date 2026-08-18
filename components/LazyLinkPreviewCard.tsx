'use client'

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from 'react'
import cn from 'classnames'
import { getLinkPreviewPresentation } from '@jihuayu/notion-type'
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

function renderPreviewTitle(prefix: string, name: string) {
  if (!prefix) return name
  return (
    <>
      <span className="link-preview-title-owner">{prefix}</span>
      <span className="link-preview-title-name">{name}</span>
    </>
  )
}

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
  const showImage = Boolean(generatedImageUrl && !imageFailed)
  const presentation = getLinkPreviewPresentation(
    displayUrl,
    resolvedPreview.title || resolvedPreview.hostname || displayUrl,
    resolvedPreview.hostname
  )

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
      data-preview-kind={presentation.previewKind}
      className={cn('link-preview-card', className)}
    >
      {showImage && (
        <span className="link-preview-card-media">
          <img
            src={generatedImageUrl}
            alt=""
            className="link-preview-cover"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        </span>
      )}
      <span className="link-preview-card-body">
        <span className="link-preview-card-title">
          {renderPreviewTitle(presentation.titlePrefix, presentation.titleName)}
        </span>
        {resolvedPreview.description && (
          <span className="link-preview-card-description">{resolvedPreview.description}</span>
        )}
        <span className="link-preview-card-footer">
          {iconUrl
            ? (
              <span className="link-preview-card-icon">
                <img src={iconUrl} alt="" loading="lazy" />
              </span>
            )
            : <span className="link-preview-card-icon link-preview-card-icon-fallback" />}
          <span className="link-preview-card-provider">{presentation.providerLabel}</span>
        </span>
      </span>
    </a>
  )
}
