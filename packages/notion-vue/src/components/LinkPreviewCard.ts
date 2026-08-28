import { defineComponent, h } from 'vue'
import cn from 'classnames'
import type { LinkPreviewCardProps } from '../types'
import { buildFallbackLinkPreview, normalizePreviewUrl, toOgProxyImageUrl } from '../utils/notion'

/**
 * EN: In-page Notion bookmark / link_preview card. Do not reuse UrlMentionHoverCard styles here.
 * ZH: 正文里的书签 / link_preview 卡片。不要复用悬浮预览 UrlMentionHoverCard 的结构和样式。
 */

export default defineComponent({
  name: 'LinkPreviewCard',
  props: {
    url: { type: String, required: true },
    class: { type: String, default: '' },
    preview: { type: Object as () => import('../types').LinkPreviewData | null | undefined, default: null }
  },
  setup(props) {
    return () => {
      const normalizedUrl = normalizePreviewUrl(props.url) || ''
      const fallback = buildFallbackLinkPreview(normalizedUrl || props.url)
      const resolvedPreview = {
        ...fallback,
        ...(props.preview || {}),
        url: props.preview?.url || normalizedUrl || fallback.url
      }

      const displayUrl = resolvedPreview.url || normalizedUrl
      const generatedImageUrl = displayUrl ? toOgProxyImageUrl(`${resolvedPreview.image || ''}`.trim(), displayUrl) : ''
      const iconUrl = displayUrl ? toOgProxyImageUrl(`${resolvedPreview.icon || ''}`.trim(), displayUrl) : ''
      if (!displayUrl) return null

      return h('a', {
        href: displayUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        'data-link-preview-card': 'true',
        'data-has-image': generatedImageUrl ? 'true' : 'false',
        class: cn(
          'link-preview-card nvue-link-preview-card',
          props.class
        ),
        style: 'opacity: 1'
      }, [
        h('div', { class: 'link-preview-card-inner nvue-link-preview-inner' }, [
          h('div', {
            class: cn(
              'link-preview-card-main nvue-link-preview-main',
              generatedImageUrl ? 'nvue-link-preview-main-with-image' : 'nvue-link-preview-main-without-image'
            )
          }, [
            h('p', { class: 'nvue-link-preview-title' },
              resolvedPreview.title || resolvedPreview.hostname || displayUrl
            ),
            resolvedPreview.description
              ? h('p', {
                  class: 'nvue-link-preview-description',
                  style: 'display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;'
                }, resolvedPreview.description)
              : null,
            h('div', { class: 'nvue-link-preview-footer' }, [
              iconUrl
                ? h('span', { class: 'nvue-link-preview-icon-frame' }, [
                    h('img', {
                      src: iconUrl,
                      alt: '',
                      class: 'nvue-link-preview-icon',
                      loading: 'lazy'
                    })
                  ])
                : h('span', { class: 'nvue-link-preview-icon-placeholder' }),
              h('span', { class: 'nvue-truncate' }, displayUrl)
            ])
          ]),
          generatedImageUrl
            ? h('div', { class: 'link-preview-card-media nvue-link-preview-media' }, [
                h('div', { class: 'nvue-link-preview-media-frame' }, [
                  h('img', {
                    src: generatedImageUrl,
                    alt: '',
                    class: 'link-preview-cover nvue-link-preview-cover',
                    style: 'filter: none',
                    loading: 'lazy'
                  })
                ])
              ])
            : null
        ])
      ])
    }
  }
})
