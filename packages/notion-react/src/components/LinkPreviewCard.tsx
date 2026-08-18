import cn from 'classnames'
import { getLinkPreviewPresentation } from '@jihuayu/notion-type'
import type { LinkPreviewCardProps } from '../types'
import { buildFallbackLinkPreview, normalizePreviewUrl, toOgProxyImageUrl } from '../utils/notion'

function renderPreviewTitle(prefix: string, name: string) {
  if (!prefix) return name
  return (
    <>
      <span className="link-preview-title-owner">{prefix}</span>
      <span className="link-preview-title-name">{name}</span>
    </>
  )
}

export default function LinkPreviewCard({ url, className, preview }: LinkPreviewCardProps) {
  const normalizedUrl = normalizePreviewUrl(url) || ''
  const fallback = buildFallbackLinkPreview(normalizedUrl || url)
  const resolvedPreview = {
    ...fallback,
    ...(preview || {}),
    url: preview?.url || normalizedUrl || fallback.url
  }

  const displayUrl = resolvedPreview.url || normalizedUrl
  const generatedImageUrl = displayUrl ? toOgProxyImageUrl(`${resolvedPreview.image || ''}`.trim(), displayUrl) : ''
  const iconUrl = displayUrl ? toOgProxyImageUrl(`${resolvedPreview.icon || ''}`.trim(), displayUrl) : ''
  const presentation = getLinkPreviewPresentation(
    displayUrl,
    resolvedPreview.title || resolvedPreview.hostname || displayUrl,
    resolvedPreview.hostname
  )
  if (!displayUrl) return null

  return (
    <a
      href={displayUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-link-preview-card="true"
      data-has-image={generatedImageUrl ? 'true' : 'false'}
      data-preview-kind={presentation.previewKind}
      className={cn('link-preview-card', className)}
    >
      {generatedImageUrl && (
        <span className="link-preview-card-media">
          <img
            src={generatedImageUrl}
            alt=""
            className="link-preview-cover"
            loading="lazy"
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
