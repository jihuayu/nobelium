import katex from 'katex'
import type { LinkPreviewData, LinkPreviewMap, NotionBlock, NotionBulletedListItemBlock, NotionColumnBlock, NotionHeading1Block, NotionHeading2Block, NotionHeading3Block, NotionHeading4Block, NotionNumberedListItemBlock, NotionParagraphBlock, NotionRichText, NotionTableRowBlock } from '@jihuayu/notion-type'
import type { NotionRenderModel } from '@jihuayu/notion-render-core'
import {
  buildNotionPublicUrl,
  escapeHtml,
  extractNotionPageIdFromUrl,
  getFileBlockName,
  getFileBlockUrl,
  getLinkToPageLabel,
  getPlainTextFromRichText,
  isInternalHref,
  normalizeCodeLanguage,
  normalizeNotionEntityId,
  normalizePreviewUrl,
  normalizeRichTextUrl,
  parseUrl,
  resolveEmbedIframeUrl,
  rewriteNotionPageHref
} from '@jihuayu/notion-type'
import {
  attr,
  buildFallbackLinkPreview,
  classNames,
  getAnnotationColorClasses,
  getBlockClassName,
  getCalloutIconUrl,
  getHeadingAnchorId,
  renderFallbackHighlightedCodeHtml,
  toOgProxyImageUrl
} from './html-utils'

export interface NotionAstroRenderOptions {
  locale?: string
  className?: string
}

type HeadingBlock = NotionHeading1Block | NotionHeading2Block | NotionHeading3Block | NotionHeading4Block

interface RenderContext {
  model: NotionRenderModel
  locale: string
}

function renderEquationHtml(expression: string, displayMode = false): string {
  if (!expression) return ''
  try {
    return katex.renderToString(expression, { displayMode, throwOnError: false, strict: 'ignore' })
  } catch {
    return escapeHtml(expression)
  }
}

function isTableRowBlock(block: NotionBlock | undefined): block is NotionTableRowBlock {
  return block?.type === 'table_row'
}

function isBulletedListItemBlock(block: NotionBlock | undefined): block is NotionBulletedListItemBlock {
  return block?.type === 'bulleted_list_item'
}

function isNumberedListItemBlock(block: NotionBlock | undefined): block is NotionNumberedListItemBlock {
  return block?.type === 'numbered_list_item'
}

function isParagraphBlock(block: NotionBlock | undefined): block is NotionParagraphBlock {
  return block?.type === 'paragraph'
}

function getHeadingPayload(block: HeadingBlock) {
  switch (block.type) {
    case 'heading_1':
      return block.heading_1
    case 'heading_2':
      return block.heading_2
    case 'heading_3':
      return block.heading_3
    case 'heading_4':
      return block.heading_4
  }
}

function getHeadingTag(block: HeadingBlock) {
  return block.type === 'heading_1' ? 'h1' : block.type === 'heading_2' ? 'h2' : block.type === 'heading_3' ? 'h3' : 'h4'
}

function headingClass(block: HeadingBlock): string {
  if (block.type === 'heading_1') return 'font-serif font-semibold text-inherit scroll-mt-20 text-[2rem] leading-[1.24] mt-12 mb-3'
  if (block.type === 'heading_2') return 'font-serif font-semibold text-inherit scroll-mt-20 text-[1.62rem] leading-[1.28] mt-10 mb-2'
  if (block.type === 'heading_3') return 'font-serif font-semibold text-inherit scroll-mt-20 text-[1.34rem] leading-[1.34] mt-8 mb-1.5'
  return 'font-serif font-semibold text-inherit scroll-mt-20 text-[1.16rem] leading-[1.4] mt-6 mb-1'
}

function looksLikeHttpUrl(text: string): boolean {
  return /^https?:\/\//i.test(text.trim())
}

function getUrlMentionLabel(href: string, textContent: string): string {
  const trimmedText = textContent.trim()
  if (trimmedText && !looksLikeHttpUrl(trimmedText)) return trimmedText
  const parsed = parseUrl(href)
  if (!parsed) return trimmedText || 'link'
  const segments = parsed.pathname.split('/').filter(Boolean)
  return decodeURIComponent(segments[segments.length - 1] || parsed.hostname || 'link')
}

function getMentionPayload(item: NotionRichText): Record<string, unknown> | null {
  const mention = (item as { mention?: unknown }).mention
  return mention && typeof mention === 'object' ? mention as Record<string, unknown> : null
}

function getRichTextLink(item: NotionRichText): string | null {
  if (item.type === 'text') {
    const text = (item as { text?: { link?: { url?: string } | null } }).text
    return text?.link?.url || null
  }
  const mention = getMentionPayload(item)
  if (item.type === 'mention' && mention?.type === 'link_preview') {
    return ((mention.link_preview as { url?: string } | undefined)?.url) || item.href || null
  }
  if (item.type === 'mention' && mention?.type === 'link_mention') {
    return ((mention.link_mention as { href?: string } | undefined)?.href) || item.href || null
  }
  return item.href || null
}

function formatDateMention(start: string, locale: string): string {
  const parsed = new Date(start)
  if (Number.isNaN(parsed.getTime())) return start
  try {
    return new Intl.DateTimeFormat(locale || 'zh-CN', { dateStyle: 'medium' }).format(parsed)
  } catch {
    return start
  }
}

interface MentionPreview {
  href: string
  title: string
  description: string
  icon: string
  image: string
  provider: string
}

function hostnameOf(href: string): string {
  const parsed = parseUrl(href)
  return parsed ? parsed.hostname.replace(/^www\./i, '') : href
}

function mentionPreviewFromMap(href: string, label: string, previewMap: LinkPreviewMap): MentionPreview | null {
  const normalized = normalizeRichTextUrl(href)
  const preview = normalized ? previewMap[normalized] : undefined
  if (!preview) return null
  const previewHref = `${preview.url || href}`.trim() || href
  return {
    href: previewHref,
    title: `${preview.title || ''}`.trim() || label,
    description: `${preview.description || ''}`.trim(),
    icon: toOgProxyImageUrl(`${preview.icon || ''}`.trim(), previewHref),
    image: toOgProxyImageUrl(`${preview.image || ''}`.trim(), previewHref),
    provider: `${preview.hostname || ''}`.trim() || hostnameOf(previewHref)
  }
}

function mentionPreviewFromRichText(item: NotionRichText, href: string, label: string, ctx: RenderContext, rawHref: string | null): MentionPreview | null {
  const mention = getMentionPayload(item)
  if (item.type === 'mention' && mention?.type === 'link_mention') {
    const payload = (mention.link_mention || {}) as Record<string, string | undefined>
    return {
      href: `${payload.href || href}`.trim() || href,
      title: `${payload.title || ''}`.trim() || label,
      description: `${payload.description || ''}`.trim(),
      icon: toOgProxyImageUrl(`${payload.icon_url || ''}`.trim(), href),
      image: toOgProxyImageUrl(`${payload.thumbnail_url || ''}`.trim(), href),
      provider: `${payload.link_provider || ''}`.trim() || hostnameOf(href)
    }
  }
  if (item.type === 'mention' && mention?.type === 'link_preview') {
    return mentionPreviewFromMap(href, label, ctx.model.linkPreviewMap)
  }
  if (isInternalHref(href)) {
    const pageId = extractNotionPageIdFromUrl(rawHref)
    const preview = pageId ? ctx.model.pagePreviewMap[pageId] : undefined
    if (!preview) return mentionPreviewFromMap(href, label, ctx.model.linkPreviewMap)
    const previewHref = `${preview.url || href}`.trim() || href
    return {
      href: previewHref,
      title: `${preview.title || ''}`.trim() || label,
      description: `${preview.description || ''}`.trim(),
      icon: toOgProxyImageUrl(`${preview.icon || ''}`.trim(), previewHref),
      image: toOgProxyImageUrl(`${preview.image || ''}`.trim(), previewHref),
      provider: `${preview.hostname || ''}`.trim() || hostnameOf(previewHref)
    }
  }
  return mentionPreviewFromMap(href, label, ctx.model.linkPreviewMap)
}

function renderHoverableAnchor(href: string, innerHtml: string, className: string, preview: MentionPreview | null, isInternal: boolean): string {
  const target = isInternal ? '' : ' target="_blank" rel="noopener noreferrer"'
  const previewAttr = preview
    ? ` data-url-mention="true" data-preview="${attr(JSON.stringify(preview))}"`
    : ''
  return `<a href="${attr(href)}"${target} class="${className}"${previewAttr}>${innerHtml}</a>`
}

function renderRichText(items: NotionRichText[] | undefined, ctx: RenderContext): string {
  if (!items?.length) return ''
  return items.map(item => {
    const mention = getMentionPayload(item)
    if (item.type === 'mention' && mention?.type === 'date') {
      const date = mention.date as { start?: string, end?: string } | undefined
      const start = `${date?.start || ''}`.trim()
      const label = formatDateMention(start, ctx.locale)
      return `<span class="notion-date-mention"><span class="notion-date-mention-prefix" aria-hidden="true">@</span><span class="notion-date-mention-text">${escapeHtml(label)}</span></span>`
    }

    const textContent = item.type === 'equation'
      ? (item as { equation?: { expression?: string } }).equation?.expression || ''
      : item.plain_text || ''
    const annotations = item.annotations || {}
    const { textColorClassName, backgroundColorClassName } = getAnnotationColorClasses(annotations)
    const inner = item.type === 'equation'
      ? renderEquationHtml(textContent, false)
      : escapeHtml(textContent)
    const span = `<span class="${classNames(
      annotations.bold && 'font-semibold',
      annotations.italic && 'italic',
      annotations.strikethrough && 'line-through',
      annotations.underline && 'underline',
      textColorClassName,
      backgroundColorClassName,
      annotations.code && 'notion-inline-code'
    )}">${inner}</span>`

    const rawHref = getRichTextLink(item)
    const href = rewriteNotionPageHref(rawHref, ctx.model.pageHrefMap)
    if (!href) return span

    const isInternal = isInternalHref(href)
    if (mention?.type === 'link_preview' || mention?.type === 'link_mention') {
      const label = getUrlMentionLabel(href, textContent)
      const preview = mentionPreviewFromRichText(item, href, label, ctx, rawHref)
      return renderHoverableAnchor(
        href,
        `<span class="notion-url-mention-label">${escapeHtml(label)}</span>`,
        'notion-url-mention notion-url-mention-link-preview',
        preview,
        isInternal
      )
    }

    const preview = mentionPreviewFromRichText(item, href, textContent.trim() || href, ctx, rawHref)
    return renderHoverableAnchor(
      href,
      span,
      'notion-url-mention-inline text-stone-900 dark:text-stone-100 underline underline-offset-4 decoration-stone-400 dark:decoration-stone-600',
      preview,
      isInternal
    )
  }).join('')
}

function unsupported(message: string): string {
  return `<div class="my-4 rounded border border-dashed border-stone-300 dark:border-stone-700 p-3 text-sm text-stone-500 dark:text-stone-400">${escapeHtml(message)}</div>`
}

function renderLinkPreviewCard(url: string, previewMap: LinkPreviewMap): string {
  const normalizedUrl = normalizePreviewUrl(url) || url
  const fallback = buildFallbackLinkPreview(normalizedUrl)
  const preview = previewMap[normalizeRichTextUrl(url)] as LinkPreviewData | undefined
  const resolved = { ...fallback, ...(preview || {}), url: preview?.url || normalizedUrl || fallback.url }
  const displayUrl = resolved.url || normalizedUrl
  if (!displayUrl) return ''
  const imageUrl = toOgProxyImageUrl(`${resolved.image || ''}`.trim(), displayUrl)
  const iconUrl = toOgProxyImageUrl(`${resolved.icon || ''}`.trim(), displayUrl)
  const title = escapeHtml(resolved.title || resolved.hostname || displayUrl)
  const description = resolved.description ? `<p class="mt-0.5 text-stone-600 dark:text-stone-300 text-sm leading-5 overflow-hidden">${escapeHtml(resolved.description)}</p>` : ''
  const icon = iconUrl
    ? `<img src="${attr(iconUrl)}" alt="" class="h-4 w-4 rounded-sm bg-transparent object-contain" loading="lazy" />`
    : '<span class="h-4 w-4 rounded-sm bg-stone-300 dark:bg-stone-700 flex-none"></span>'
  const media = imageUrl
    ? `<div class="link-preview-card-media basis-[35%] shrink-0 h-full"><img src="${attr(imageUrl)}" alt="" class="h-full w-full object-cover" loading="lazy" /></div>`
    : ''
  return `<a href="${attr(displayUrl)}" target="_blank" rel="noopener noreferrer" data-link-preview-card="true" class="link-preview-card block my-4 h-[110px] rounded-md border border-stone-200 dark:border-stone-700 overflow-hidden">
    <div class="link-preview-card-inner flex h-full items-stretch">
      <div class="link-preview-card-main min-w-0 flex flex-col px-3 py-2 ${imageUrl ? 'basis-[65%] shrink-0' : 'flex-1'}">
        <p class="text-base text-stone-900 dark:text-stone-100 font-medium truncate">${title}</p>
        ${description}
        <div class="mt-auto pt-1.5 flex items-center gap-2 text-stone-800 dark:text-stone-200 text-xs">${icon}<span class="truncate">${escapeHtml(displayUrl)}</span></div>
      </div>
      ${media}
    </div>
  </a>`
}

function pageCard(label: string, href: string, prefix: string): string {
  const isInternal = href.startsWith('/')
  const target = isInternal ? '' : ' target="_blank" rel="noopener noreferrer"'
  const body = `<span aria-hidden="true">${escapeHtml(prefix)}</span><span class="whitespace-pre-wrap">${escapeHtml(label)}</span>`
  const cardClass = 'inline-flex items-center gap-2 rounded-md border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/40 px-3 py-1.5 text-sm'
  return href
    ? `<div class="my-3"><a href="${attr(href)}"${target} class="${cardClass}">${body}</a></div>`
    : `<div class="my-3"><div class="${cardClass}">${body}</div></div>`
}

function renderChildren(blockId: string, ctx: RenderContext): string {
  const childIds = ctx.model.document.childrenById[blockId] || []
  return childIds.length ? renderBlockList(childIds, ctx) : ''
}

function renderBulleted(block: NotionBulletedListItemBlock, ctx: RenderContext): string {
  return `<li class="${getBlockClassName(block.id)}"><div class="notion-text whitespace-pre-wrap">${renderRichText(block.bulleted_list_item.rich_text, ctx)}</div>${renderChildren(block.id, ctx)}</li>`
}

function renderNumbered(block: NotionNumberedListItemBlock, ctx: RenderContext): string {
  return `<li class="${getBlockClassName(block.id)}"><div class="notion-text whitespace-pre-wrap">${renderRichText(block.numbered_list_item.rich_text, ctx)}</div>${renderChildren(block.id, ctx)}</li>`
}

function renderBlock(block: NotionBlock, ctx: RenderContext): string {
  if (!block?.id) return ''
  const base = getBlockClassName(block.id)
  const doc = ctx.model.document
  const childrenById = doc.childrenById || {}
  const blocksById = doc.blocksById || {}

  switch (block.type) {
    case 'paragraph': {
      const text = block.paragraph.rich_text.length ? `<p class="notion-text whitespace-pre-wrap">${renderRichText(block.paragraph.rich_text, ctx)}</p>` : ''
      return `<div class="${base}">${text}${renderChildren(block.id, ctx)}</div>`
    }
    case 'heading_1':
    case 'heading_2':
    case 'heading_3':
    case 'heading_4': {
      const heading = block as HeadingBlock
      const payload = getHeadingPayload(heading)
      const tag = getHeadingTag(heading)
      const content = renderRichText(payload.rich_text, ctx)
      const hasChildren = (childrenById[block.id] || []).length > 0
      if (payload.is_toggleable) {
        return `<details id="${getHeadingAnchorId(block.id)}" class="${classNames(base, 'nobelium-toggle nobelium-toggle-heading my-3', !hasChildren && 'nobelium-toggle-empty')}">
          <summary class="nobelium-toggle-summary"><${tag} class="${headingClass(heading)} nobelium-toggle-title whitespace-pre-wrap">${content}</${tag}></summary>
          ${hasChildren ? `<div class="nobelium-toggle-content"><div class="content">${renderChildren(block.id, ctx)}</div></div>` : ''}
        </details>`
      }
      return `<div id="${getHeadingAnchorId(block.id)}" class="${base}"><${tag} class="${headingClass(heading)}">${content}</${tag}>${renderChildren(block.id, ctx)}</div>`
    }
    case 'quote':
      return `<div class="${base}"><blockquote class="notion-quote border-l-4 border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 rounded-r-md whitespace-pre-wrap">${renderRichText(block.quote.rich_text, ctx)}</blockquote>${renderChildren(block.id, ctx)}</div>`
    case 'callout': {
      const emoji = block.callout.icon?.type === 'emoji' ? block.callout.icon.emoji : ''
      const iconUrl = getCalloutIconUrl(block.callout.icon || null)
      const icon = emoji
        ? `<span aria-hidden="true">${escapeHtml(emoji)}</span>`
        : iconUrl
          ? `<img src="${attr(iconUrl)}" alt="" class="h-[1.05em] w-[1.05em] object-contain" />`
          : '<span aria-hidden="true">i</span>'
      return `<div class="${base}"><div class="notion-callout my-4 rounded-md border border-stone-200 dark:border-stone-700 px-3 py-2 flex items-start"><span class="notion-page-icon-inline flex-none">${icon}</span><div class="notion-callout-text whitespace-pre-wrap">${renderRichText(block.callout.rich_text, ctx)}</div></div>${renderChildren(block.id, ctx)}</div>`
    }
    case 'equation': {
      const expression = block.equation.expression || ''
      return `<div class="${base}">${expression ? `<div class="notion-equation-block my-4 overflow-x-auto text-center">${renderEquationHtml(expression, true)}</div>` : ''}${renderChildren(block.id, ctx)}</div>`
    }
    case 'code': {
      const source = getPlainTextFromRichText(block.code.rich_text)
      const language = normalizeCodeLanguage(block.code.language || '')
      if (language === 'mermaid') {
        return `<div class="${base}"><pre class="mermaid-source" hidden>${escapeHtml(source)}</pre><div class="mermaid-mount my-4" data-mermaid></div>${renderChildren(block.id, ctx)}</div>`
      }
      const highlighted = ctx.model.highlightedCodeByBlockId[block.id]
      const codeContentId = `notion-code-content-${block.id.replaceAll('-', '')}`
      const langLabel = highlighted?.displayLanguage || `${block.code.language || ''}`.trim() || 'plain text'
      return `<div class="${base}"><div class="notion-code-block my-5 overflow-hidden">
        <span class="notion-code-language notion-code-language-floating">${escapeHtml(langLabel)}</span>
        <button type="button" data-copy-code class="notion-code-copy">Copy</button>
        <div id="${codeContentId}" class="notion-code-content">${highlighted?.html || renderFallbackHighlightedCodeHtml(source)}</div>
      </div>${renderChildren(block.id, ctx)}</div>`
    }
    case 'image': {
      const source = block.image.type === 'external' ? block.image.external?.url : block.image.file?.url
      const caption = block.image.caption || []
      const captionText = getPlainTextFromRichText(caption)
      if (!source) return `<div class="${base}">${unsupported('Unsupported image source')}</div>`
      return `<figure class="${classNames(base, 'my-6')}"><img src="${attr(toOgProxyImageUrl(source))}" alt="${attr(captionText || 'Notion image')}" loading="lazy" class="w-full rounded-md border border-stone-200 dark:border-stone-800" />${caption.length ? `<figcaption class="mt-2 notion-asset-caption whitespace-pre-wrap">${renderRichText(caption, ctx)}</figcaption>` : ''}${renderChildren(block.id, ctx)}</figure>`
    }
    case 'column_list': {
      const columns = (childrenById[block.id] || []).map(id => blocksById[id]).filter((column): column is NotionColumnBlock => column?.type === 'column')
      const body = columns.length
        ? `<div class="my-4 flex flex-col gap-4 md:flex-row">${columns.map(column => `<div class="${getBlockClassName(column.id)}" style="flex:${column.column.width_ratio || 1};min-width:0">${renderChildren(column.id, ctx)}</div>`).join('')}</div>`
        : renderChildren(block.id, ctx)
      return `<div class="${base}">${body}</div>`
    }
    case 'column':
      return `<div class="${base}" style="flex:${block.column.width_ratio || 1};min-width:0">${renderChildren(block.id, ctx)}</div>`
    case 'toggle': {
      const hasChildren = (childrenById[block.id] || []).length > 0
      return `<details class="${classNames(base, 'nobelium-toggle my-2', !hasChildren && 'nobelium-toggle-empty')}">
        <summary class="nobelium-toggle-summary"><span class="nobelium-toggle-title whitespace-pre-wrap">${renderRichText(block.toggle.rich_text, ctx)}</span></summary>
        ${hasChildren ? `<div class="nobelium-toggle-content"><div class="content">${renderChildren(block.id, ctx)}</div></div>` : ''}
      </details>`
    }
    case 'template':
      return `<div class="${base}">${block.template.rich_text.length ? `<p class="notion-text whitespace-pre-wrap">${renderRichText(block.template.rich_text, ctx)}</p>` : ''}${renderChildren(block.id, ctx)}</div>`
    case 'tab': {
      const tabPanels = (childrenById[block.id] || [])
        .map(id => blocksById[id])
        .filter(isParagraphBlock)
        .map((panel, index) => ({ panel, index, childIds: childrenById[panel.id] || [] }))
        .filter(({ childIds }) => childIds.length > 0)
      if (!tabPanels.length) return ''
      return `<div class="${classNames(base, 'notion-tabs-block')}">${tabPanels.map(({ panel, index, childIds }) => {
        const inputId = `notion-tab-${block.id.replaceAll('-', '')}-${panel.id.replaceAll('-', '')}`
        const label = getPlainTextFromRichText(panel.paragraph.rich_text).trim() || `Tab ${index + 1}`
        const emoji = panel.paragraph.icon?.type === 'emoji' ? panel.paragraph.icon.emoji || '' : ''
        return `<div class="notion-tab-item">
          <input id="${inputId}" class="notion-tab-input" type="radio" name="notion-tab-group-${block.id}" ${index === 0 ? 'checked' : ''} />
          <label for="${inputId}" class="notion-tab-label">${emoji ? `<span class="notion-tab-label-icon" aria-hidden="true">${escapeHtml(emoji)}</span>` : ''}<span class="notion-tab-label-text">${escapeHtml(label)}</span></label>
          <div class="notion-tab-panel">${renderBlockList(childIds, ctx)}</div>
        </div>`
      }).join('')}</div>`
    }
    case 'table_of_contents':
      if (!ctx.model.toc.length) return ''
      return `<nav class="${classNames(base, 'my-4 rounded-md border border-stone-200 dark:border-stone-700 px-3 py-2')}"><p class="text-xs uppercase tracking-wide text-stone-500 mb-2">Table of contents</p><ul class="space-y-1">${ctx.model.toc.map(item => `<li style="margin-left:${item.indentLevel * 14}px"><a href="#${getHeadingAnchorId(item.id)}" class="text-sm">${escapeHtml(item.text)}</a></li>`).join('')}</ul></nav>`
    case 'link_to_page': {
      const targetId = `${block.link_to_page.page_id || block.link_to_page.database_id || block.link_to_page.block_id || block.link_to_page.comment_id || ''}`.trim()
      const href = ctx.model.pageHrefMap[normalizeNotionEntityId(targetId)] || buildNotionPublicUrl(targetId)
      return `<div class="${base}">${pageCard(getLinkToPageLabel(block.link_to_page), href, '->')}${renderChildren(block.id, ctx)}</div>`
    }
    case 'child_page': {
      const href = ctx.model.pageHrefMap[normalizeNotionEntityId(block.id)] || buildNotionPublicUrl(block.id)
      return `<div class="${base}">${pageCard(`${block.child_page.title || ''}`.trim() || 'Untitled page', href, 'Pg')}${renderChildren(block.id, ctx)}</div>`
    }
    case 'child_database': {
      const href = ctx.model.pageHrefMap[normalizeNotionEntityId(block.id)] || buildNotionPublicUrl(block.id)
      return `<div class="${base}">${pageCard(`${block.child_database.title || ''}`.trim() || 'Untitled database', href, 'DB')}${renderChildren(block.id, ctx)}</div>`
    }
    case 'synced_block': {
      const syncedFrom = block.synced_block.synced_from?.block_id || ''
      const hasChildren = (childrenById[block.id] || []).length > 0
      return `<div class="${base}">${hasChildren ? renderChildren(block.id, ctx) : unsupported(syncedFrom ? `Synced block (${syncedFrom.slice(0, 8)}...)` : 'Synced block')}</div>`
    }
    case 'breadcrumb':
      return ''
    case 'embed': {
      const embedUrl = block.embed.url || ''
      const iframeUrl = resolveEmbedIframeUrl(embedUrl)
      const normalizedEmbedUrl = normalizeRichTextUrl(embedUrl)
      const caption = block.embed.caption || []
      let embedHostname = ''
      try { if (embedUrl) embedHostname = new URL(embedUrl).hostname.replace(/^www\./i, '') } catch { embedHostname = '' }
      const frame = iframeUrl || normalizedEmbedUrl
        ? `<div class="notion-embed-frame overflow-hidden rounded-md border border-stone-200 dark:border-stone-800">${embedHostname ? `<div class="px-3 py-1.5 text-xs text-stone-400">${escapeHtml(embedHostname)}</div>` : ''}<div class="relative w-full" style="padding-top:56.25%"><iframe src="${attr(iframeUrl || normalizedEmbedUrl)}" title="${attr(embedUrl || block.id)}" class="absolute top-0 left-0 h-full w-full" allowfullscreen loading="lazy"></iframe></div></div>`
        : embedUrl
          ? renderLinkPreviewCard(embedUrl, ctx.model.linkPreviewMap)
          : unsupported('Unsupported embed block')
      return `<div class="${base}"><div class="my-4">${frame}${caption.length ? `<div class="notion-asset-caption mt-2 whitespace-pre-wrap">${renderRichText(caption, ctx)}</div>` : ''}</div>${renderChildren(block.id, ctx)}</div>`
    }
    case 'bookmark': {
      const bookmarkUrl = block.bookmark.url || ''
      const caption = block.bookmark.caption || []
      return `<div class="${base}">${bookmarkUrl ? renderLinkPreviewCard(bookmarkUrl, ctx.model.linkPreviewMap) : unsupported('Unsupported bookmark block')}${caption.length ? `<div class="notion-asset-caption mt-2 whitespace-pre-wrap">${renderRichText(caption, ctx)}</div>` : ''}${renderChildren(block.id, ctx)}</div>`
    }
    case 'video': {
      const source = getFileBlockUrl(block.video)
      const iframeUrl = resolveEmbedIframeUrl(source)
      const caption = block.video.caption || []
      const media = !source
        ? unsupported('Unsupported video block')
        : iframeUrl
          ? `<div class="relative w-full overflow-hidden rounded-md border border-stone-200 dark:border-stone-700" style="padding-top:56.25%"><iframe src="${attr(iframeUrl)}" title="${attr(source)}" class="absolute top-0 left-0 h-full w-full" allowfullscreen loading="lazy"></iframe></div>`
          : `<video src="${attr(source)}" controls preload="metadata" class="w-full rounded-md border border-stone-200 dark:border-stone-700 bg-black"></video>`
      return `<div class="${base}"><div class="my-4">${media}${caption.length ? `<div class="notion-asset-caption mt-2 whitespace-pre-wrap">${renderRichText(caption, ctx)}</div>` : ''}</div>${renderChildren(block.id, ctx)}</div>`
    }
    case 'audio': {
      const source = getFileBlockUrl(block.audio)
      const caption = block.audio.caption || []
      return `<div class="${base}"><div class="my-4">${source ? `<audio src="${attr(source)}" controls preload="metadata" class="notion-audio-block"></audio>` : unsupported('Unsupported audio block')}${caption.length ? `<div class="notion-asset-caption mt-2 whitespace-pre-wrap">${renderRichText(caption, ctx)}</div>` : ''}</div>${renderChildren(block.id, ctx)}</div>`
    }
    case 'pdf': {
      const source = getFileBlockUrl(block.pdf)
      const caption = block.pdf.caption || []
      return `<div class="${base}"><div class="my-4 rounded-md border border-stone-200 dark:border-stone-700 overflow-hidden">${source ? `<iframe src="${attr(source)}" title="${attr(source)}" class="w-full" style="height:620px" loading="lazy"></iframe><a href="${attr(source)}" target="_blank" rel="noopener noreferrer" class="block border-t px-3 py-2 text-sm">Open PDF</a>` : unsupported('Unsupported pdf block')}</div>${caption.length ? `<div class="notion-asset-caption mt-2 whitespace-pre-wrap">${renderRichText(caption, ctx)}</div>` : ''}${renderChildren(block.id, ctx)}</div>`
    }
    case 'file': {
      const fileUrl = getFileBlockUrl(block.file)
      const caption = block.file.caption || []
      return `<div class="${base}">${fileUrl ? `<a href="${attr(fileUrl)}" target="_blank" rel="noopener noreferrer" class="notion-file-block"><span class="notion-file-name">${escapeHtml(getFileBlockName(block.file, fileUrl))}</span></a>` : unsupported('Unsupported file block')}${caption.length ? `<div class="notion-asset-caption mt-2 whitespace-pre-wrap">${renderRichText(caption, ctx)}</div>` : ''}${renderChildren(block.id, ctx)}</div>`
    }
    case 'table': {
      const rows = (childrenById[block.id] || []).map(id => blocksById[id]).filter(isTableRowBlock)
      const widthFromSchema = Number(block.table.table_width) || 0
      const widthFromRows = rows.reduce((max, row) => Math.max(max, row.table_row.cells.length), 0)
      const columnCount = Math.max(widthFromSchema, widthFromRows)
      if (!rows.length || !columnCount) return `<div class="${base}">${unsupported('Unsupported table block')}</div>`
      const body = rows.map((row, rowIndex) => `<tr>${Array.from({ length: columnCount }).map((_, colIndex) => {
        const cellRichText = row.table_row.cells[colIndex] || []
        const isHeader = (!!block.table.has_column_header && rowIndex === 0) || (!!block.table.has_row_header && colIndex === 0)
        const tag = isHeader ? 'th' : 'td'
        const scope = isHeader ? (rowIndex === 0 && block.table.has_column_header ? ' scope="col"' : ' scope="row"') : ''
        return `<${tag} class="notion-table-cell${isHeader ? ' notion-table-cell-header' : ''}"${scope}><div class="whitespace-pre-wrap">${renderRichText(cellRichText, ctx) || '&nbsp;'}</div></${tag}>`
      }).join('')}</tr>`).join('')
      return `<div class="${base}"><div class="notion-table-wrapper my-4"><table class="notion-table-block"><tbody>${body}</tbody></table></div>${renderChildren(block.id, ctx)}</div>`
    }
    case 'table_row':
      return ''
    case 'link_preview':
      return `<div class="${base}">${block.link_preview.url ? renderLinkPreviewCard(block.link_preview.url, ctx.model.linkPreviewMap) : unsupported('Unsupported link preview block')}${renderChildren(block.id, ctx)}</div>`
    case 'divider':
      return `<div class="${base}"><hr class="notion-hr my-4 border-stone-200 dark:border-stone-700" />${renderChildren(block.id, ctx)}</div>`
    case 'to_do': {
      const checked = !!block.to_do.checked
      const check = checked
        ? '<span class="notion-to-do-checkbox is-checked" role="img" aria-label="Checked"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4.5 10.5 8.3 14.3 15.5 6.8" /></svg></span>'
        : '<span class="notion-to-do-checkbox" role="img" aria-label="Unchecked"></span>'
      return `<div class="${classNames(base, 'notion-to-do-block')}"><div class="notion-to-do-item flex items-baseline gap-1"><span class="notion-property-checkbox">${check}</span><div class="notion-to-do-body flex-1 min-w-0 whitespace-pre-wrap">${renderRichText(block.to_do.rich_text, ctx)}</div></div><div class="pl-7">${renderChildren(block.id, ctx)}</div></div>`
    }
    case 'bulleted_list_item':
      return renderBulleted(block, ctx)
    case 'numbered_list_item':
      return renderNumbered(block, ctx)
    default:
      return `<div class="${base}">${unsupported(`Unsupported block type: ${block.type}`)}</div>`
  }
}

function renderBlockList(blockIds: string[], ctx: RenderContext): string {
  const parts: string[] = []
  const blocksById = ctx.model.document.blocksById || {}
  for (let index = 0; index < blockIds.length; index += 1) {
    const block = blocksById[blockIds[index]]
    if (!block) continue
    if (isBulletedListItemBlock(block)) {
      const items = [renderBulleted(block, ctx)]
      while (index + 1 < blockIds.length && isBulletedListItemBlock(blocksById[blockIds[index + 1]])) {
        items.push(renderBulleted(blocksById[blockIds[index + 1]] as NotionBulletedListItemBlock, ctx))
        index += 1
      }
      parts.push(`<ul class="notion-list list-disc my-3">${items.join('')}</ul>`)
      continue
    }
    if (isNumberedListItemBlock(block)) {
      const items = [renderNumbered(block, ctx)]
      while (index + 1 < blockIds.length && isNumberedListItemBlock(blocksById[blockIds[index + 1]])) {
        items.push(renderNumbered(blocksById[blockIds[index + 1]] as NotionNumberedListItemBlock, ctx))
        index += 1
      }
      parts.push(`<ol class="notion-list list-decimal my-3">${items.join('')}</ol>`)
      continue
    }
    parts.push(renderBlock(block, ctx))
  }
  return parts.join('')
}

export function renderNotionArticleHtml(model: NotionRenderModel, options: NotionAstroRenderOptions = {}): string {
  const ctx: RenderContext = {
    model,
    locale: `${options.locale || 'zh-CN'}`.trim() || 'zh-CN'
  }
  const className = classNames('notion', options.className)
  return `<div class="${className}">${renderBlockList(model.document.rootIds || [], ctx)}</div>`
}
