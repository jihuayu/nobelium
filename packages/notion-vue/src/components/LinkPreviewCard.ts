import { defineComponent, h } from 'vue'
import cn from 'classnames'
import { getLinkPreviewPresentation } from '@jihuayu/notion-type'
import type { LinkPreviewCardProps } from '../types'
import { buildFallbackLinkPreview, normalizePreviewUrl, toOgProxyImageUrl } from '../utils/notion'

function renderPreviewTitle(prefix: string, name: string) {
  if (!prefix) return name
  return [
    h('span', { class: 'link-preview-title-owner' }, prefix),
    h('span', { class: 'link-preview-title-name' }, name)
  ]
}

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
      const presentation = getLinkPreviewPresentation(
        displayUrl,
        resolvedPreview.title || resolvedPreview.hostname || displayUrl,
        resolvedPreview.hostname
      )
      if (!displayUrl) return null

      return h('a', {
        href: displayUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        'data-link-preview-card': 'true',
        'data-has-image': generatedImageUrl ? 'true' : 'false',
        'data-preview-kind': presentation.previewKind,
        class: cn('link-preview-card', props.class)
      }, [
        generatedImageUrl
          ? h('span', { class: 'link-preview-card-media' }, [
              h('img', {
                src: generatedImageUrl,
                alt: '',
                class: 'link-preview-cover',
                loading: 'lazy'
              })
            ])
          : null,
        h('span', { class: 'link-preview-card-body' }, [
          h('span', { class: 'link-preview-card-title' },
            renderPreviewTitle(presentation.titlePrefix, presentation.titleName)
          ),
          resolvedPreview.description
            ? h('span', { class: 'link-preview-card-description' }, resolvedPreview.description)
            : null,
          h('span', { class: 'link-preview-card-footer' }, [
            iconUrl
              ? h('span', { class: 'link-preview-card-icon' }, [
                  h('img', {
                    src: iconUrl,
                    alt: '',
                    loading: 'lazy'
                  })
                ])
              : h('span', { class: 'link-preview-card-icon link-preview-card-icon-fallback' }),
            h('span', { class: 'link-preview-card-provider' }, presentation.providerLabel)
          ])
        ])
      ])
    }
  }
})
