import cn from 'classnames'
import * as stylex from '@stylexjs/stylex'
import type { LinkPreviewCardProps } from '../types'
import { buildFallbackLinkPreview, normalizePreviewUrl, toOgProxyImageUrl } from '../utils/notion'
import { linkPreviewStyles as styles } from './LinkPreviewCard.stylex'

/**
 * EN: In-page Notion bookmark / link_preview card. Do not reuse UrlMentionHoverCard styles here.
 * ZH: 正文里的书签 / link_preview 卡片。不要复用悬浮预览 UrlMentionHoverCard 的结构和样式。
 */

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
  if (!displayUrl) return null

  return (
    <a
      href={displayUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-link-preview-card="true"
      data-has-image={generatedImageUrl ? 'true' : 'false'}
      className={cn(
        'link-preview-card',
        stylex.props(styles.card).className,
        className
      )}
      style={{ opacity: 1 }}
    >
      <div className={`link-preview-card-inner ${stylex.props(styles.inner).className}`}>
        <div className={cn('link-preview-card-main', stylex.props(styles.main, generatedImageUrl ? styles.mainWithImage : styles.mainWithoutImage).className)}>
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
        {generatedImageUrl && (
          <div className={`link-preview-card-media ${stylex.props(styles.media).className}`}>
            <div {...stylex.props(styles.mediaFrame)}>
              <img
                src={generatedImageUrl}
                alt=""
                className={`link-preview-cover ${stylex.props(styles.cover).className}`}
                style={{ filter: 'none' }}
                loading="lazy"
              />
            </div>
          </div>
        )}
      </div>
    </a>
  )
}
