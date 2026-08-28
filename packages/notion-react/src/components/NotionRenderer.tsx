import { type ReactNode } from 'react'
import cn from 'classnames'
import * as stylex from '@stylexjs/stylex'
import { colors } from '../theme.stylex'
import katex from 'katex'
import type {
  BlockRenderer,
  BlockRendererProps,
  LinkPreviewCardProps,
  NotionBlock,
  NotionBookmarkBlock,
  NotionBulletedListItemBlock,
  NotionCalloutBlock,
  NotionChildDatabaseBlock,
  NotionChildPageBlock,
  NotionColumnBlock,
  NotionCodeBlock,
  NotionEmbedBlock,
  NotionEquationBlock,
  NotionFileBlock,
  NotionImageBlock,
  NotionLinkPreviewBlock,
  NotionLinkToPageBlock,
  NotionNumberedListItemBlock,
  NotionBlockType,
  NotionParagraphBlock,
  NotionPdfBlock,
  NotionQuoteBlock,
  NotionRenderOptions,
  NotionRendererProps,
  ResolvedNotionRenderOptions,
  NotionSyncedBlock,
  NotionTableRowBlock,
  NotionTableBlock,
  NotionTemplateBlock,
  NotionToDoBlock,
  NotionToggleBlock,
  NotionVideoBlock,
  NotionAudioBlock,
  NotionHeading1Block,
  NotionHeading2Block,
  NotionHeading3Block,
  NotionHeading4Block,
  UnsupportedBlockProps
} from '../types'
import {
  buildNotionPublicUrl,
  escapeHtml,
  getBlockClassName,
  getCalloutIconUrl,
  getFileBlockName,
  getFileBlockUrl,
  getHeadingAnchorId,
  getLinkToPageLabel,
  getPlainTextFromRichText,
  normalizeCodeLanguage,
  normalizeNotionEntityId,
  normalizeRichTextUrl,
  renderFallbackHighlightedCodeHtml,
  resolveEmbedIframeUrl,
  toOgProxyImageUrl
} from '../utils/notion'
import DefaultLinkPreviewCard from './LinkPreviewCard'
import DefaultMermaidBlock from './MermaidBlock'
import CodeBlockCopyButton from './CodeBlockCopyButton'
import ImageLightbox from './ImageLightbox'
import { RichText } from './RichText'

function renderEquationHtml(expression: string, displayMode = false): string {
  if (!expression) return ''
  try {
    return katex.renderToString(expression, { displayMode, throwOnError: false, strict: 'ignore' })
  } catch {
    return escapeHtml(expression)
  }
}

function resolveRenderOptions(input?: NotionRenderOptions): ResolvedNotionRenderOptions {
  return {
    locale: `${input?.locale || 'zh-CN'}`.trim() || 'zh-CN',
    timeZone: `${input?.timeZone || ''}`.trim(),
    dateMention: {
      displayMode: input?.dateMention?.displayMode || 'relative',
      includeTime: input?.dateMention?.includeTime || 'always',
      absoluteDateFormat: `${input?.dateMention?.absoluteDateFormat || 'YYYY年M月D日'}`.trim() || 'YYYY年M月D日',
      absoluteDateTimeFormat:
        `${input?.dateMention?.absoluteDateTimeFormat || 'YYYY年M月D日 HH:mm:ss'}`.trim() || 'YYYY年M月D日 HH:mm:ss',
      relativeStyle: input?.dateMention?.relativeStyle || 'short'
    }
  }
}

function UnsupportedBlock({ block, className, message }: UnsupportedBlockProps) {
  return (
    <div className={className}>
      <div {...stylex.props(styles.unsupported)}>
        {message || `Unsupported block type: ${block.type}`}
      </div>
    </div>
  )
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

type NotionHeadingBlock = NotionHeading1Block | NotionHeading2Block | NotionHeading3Block | NotionHeading4Block

function getHeadingPayload(block: NotionHeadingBlock) {
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

function getHeadingTag(block: NotionHeadingBlock) {
  return block.type === 'heading_1' ? 'h1' : block.type === 'heading_2' ? 'h2' : block.type === 'heading_3' ? 'h3' : 'h4'
}

export default function NotionRenderer({ model, components, renderOptions, className, style }: NotionRendererProps) {
  const resolvedRenderOptions = resolveRenderOptions(renderOptions)
  const LinkPreviewCard = components?.leaves?.LinkPreviewCard || DefaultLinkPreviewCard
  const MermaidBlock = components?.leaves?.MermaidBlock || DefaultMermaidBlock
  const Unsupported = components?.leaves?.UnsupportedBlock || UnsupportedBlock
  const document = model.document
  const blocksById = document.blocksById || {}
  const childrenById = document.childrenById || {}
  const rootIds = document.rootIds || []

  const renderRichText = (richText = []) => (
    <RichText
      richText={richText}
      linkPreviewMap={model.linkPreviewMap}
      pageHrefMap={model.pageHrefMap}
      pagePreviewMap={model.pagePreviewMap}
      renderOptions={resolvedRenderOptions}
      components={components}
    />
  )

  const renderChildren = (blockId: string) => {
    const childIds = childrenById[blockId] || []
    if (!childIds.length) return null
    return renderBlockList(childIds)
  }

  const renderBlockWithOverride = (block: NotionBlock, fallback: () => ReactNode) => {
    const customRenderer = components?.blocks?.[block.type]
    if (!customRenderer) return fallback()

    const props: BlockRendererProps = {
      block,
      model,
      renderOptions: resolvedRenderOptions,
      renderChildren,
      renderRichText
    }
    return customRenderer(props)
  }

  const renderLinkPreviewCard = (url: string, previewKey: string, className?: string) => {
    const props: LinkPreviewCardProps = {
      url,
      className,
      preview: model.linkPreviewMap[previewKey]
    }
    return <LinkPreviewCard {...props} />
  }

  const renderBulletedListItem = (block: NotionBulletedListItemBlock) => renderBlockWithOverride(block, () => (
    <li key={block.id} className={getBlockClassName(block.id)}>
      <div className={`notion-text ${stylex.props(styles.preWrap).className}`}>{renderRichText(block.bulleted_list_item.rich_text)}</div>
      {renderChildren(block.id)}
    </li>
  ))

  const renderNumberedListItem = (block: NotionNumberedListItemBlock) => renderBlockWithOverride(block, () => (
    <li key={block.id} className={getBlockClassName(block.id)}>
      <div className={`notion-text ${stylex.props(styles.preWrap).className}`}>{renderRichText(block.numbered_list_item.rich_text)}</div>
      {renderChildren(block.id)}
    </li>
  ))

  const renderToDoItem = (block: NotionToDoBlock) => renderBlockWithOverride(block, () => {
    const checked = !!block.to_do.checked
    return (
      <div key={block.id} className={cn(getBlockClassName(block.id), 'notion-to-do-block')}>
        <div className={`notion-to-do-item ${stylex.props(styles.todoItem).className}`}>
          <span className="notion-property-checkbox">
            <span className={cn('notion-to-do-checkbox', checked && 'is-checked')} role="img" aria-label={checked ? 'Checked' : 'Unchecked'}>
              {checked && (
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M4.5 10.5 8.3 14.3 15.5 6.8" />
                </svg>
              )}
            </span>
          </span>
          <div className={`notion-to-do-body ${stylex.props(styles.todoBody).className}`}>{renderRichText(block.to_do.rich_text)}</div>
        </div>
        <div {...stylex.props(styles.todoChildren)}>{renderChildren(block.id)}</div>
      </div>
    )
  })

  const renderColumnBlock = (block: NotionColumnBlock) => renderBlockWithOverride(block, () => (
    <div key={block.id} className={getBlockClassName(block.id)} style={{ flex: block.column.width_ratio || 1, minWidth: 0 }}>
      {renderChildren(block.id)}
    </div>
  ))

  const renderPageReferenceCard = (label: string, href: string, className: string, prefix: string) => {
    const isInternal = href.startsWith('/')
    const cardClassName = stylex.props(styles.referenceCard).className
    return (
      <div className={cn(className, stylex.props(styles.margin3).className)}>
        {href
          ? (
            <a
              href={href}
              target={isInternal ? undefined : '_blank'}
              rel={isInternal ? undefined : 'noopener noreferrer'}
              className={cn(cardClassName, stylex.props(styles.referenceLink).className)}
            >
              <span aria-hidden="true">{prefix}</span>
              <span {...stylex.props(styles.preWrap)}>{label}</span>
            </a>
          )
          : (
            <div className={cardClassName}>
              <span aria-hidden="true">{prefix}</span>
              <span {...stylex.props(styles.preWrap)}>{label}</span>
            </div>
          )}
      </div>
    )
  }

  const renderBlock = (block: NotionBlock): ReactNode => {
    if (!block?.id) return null
    const baseClassName = getBlockClassName(block.id)

    switch (block.type) {
      case 'paragraph': {
        return renderBlockWithOverride(block, () => (
          <div key={block.id} className={baseClassName}>
            {block.paragraph.rich_text.length ? <p className={`notion-text ${stylex.props(styles.preWrap).className}`}>{renderRichText(block.paragraph.rich_text)}</p> : null}
            {renderChildren(block.id)}
          </div>
        ))
      }
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
      case 'heading_4':
        return renderBlockWithOverride(block, () => {
          const headingPayload = getHeadingPayload(block)
          const HeadingTag = getHeadingTag(block)
          const headingClass = stylex.props(
            styles.heading,
            block.type === 'heading_1' && styles.heading1,
            block.type === 'heading_2' && styles.heading2,
            block.type === 'heading_3' && styles.heading3,
            block.type === 'heading_4' && styles.heading4
          ).className
          const hasChildren = (childrenById[block.id] || []).length > 0
          const content = renderRichText(headingPayload.rich_text)
          if (headingPayload.is_toggleable) {
            return (
              <details key={block.id} id={getHeadingAnchorId(block.id)} className={cn(baseClassName, 'nobelium-toggle nobelium-toggle-heading', stylex.props(styles.margin3).className, !hasChildren && 'nobelium-toggle-empty')}>
                <summary className="nobelium-toggle-summary">
                  {hasChildren && (
                    <span className="nobelium-toggle-chevron" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" role="presentation">
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </span>
                  )}
                  <HeadingTag className={cn(headingClass, 'nobelium-toggle-title', stylex.props(styles.preWrap).className)}>{content}</HeadingTag>
                </summary>
                {hasChildren && <div className="nobelium-toggle-content"><div className="content">{renderChildren(block.id)}</div></div>}
              </details>
            )
          }

          return (
            <div key={block.id} id={getHeadingAnchorId(block.id)} className={baseClassName}>
              <HeadingTag className={headingClass}>{content}</HeadingTag>
              {renderChildren(block.id)}
            </div>
          )
        })
      case 'quote': {
        return renderBlockWithOverride(block, () => (
          <div key={block.id} className={baseClassName}>
            <blockquote className={`notion-quote ${stylex.props(styles.quote).className}`}>
              {renderRichText(block.quote.rich_text)}
            </blockquote>
            {renderChildren(block.id)}
          </div>
        ))
      }
      case 'callout': {
        return renderBlockWithOverride(block, () => {
          const emoji = block.callout.icon?.type === 'emoji' ? block.callout.icon.emoji : ''
          const iconUrl = getCalloutIconUrl(block.callout.icon || null)
          return (
            <div key={block.id} className={baseClassName}>
              <div className={`notion-callout ${stylex.props(styles.callout).className}`}>
                <span className={`notion-page-icon-inline ${stylex.props(styles.noShrink).className}`}>
                  {emoji ? <span aria-hidden="true">{emoji}</span> : iconUrl ? <img src={iconUrl} alt="" {...stylex.props(styles.calloutIcon)} /> : <span aria-hidden="true">i</span>}
                </span>
                <div className={`notion-callout-text ${stylex.props(styles.preWrap).className}`}>{renderRichText(block.callout.rich_text)}</div>
              </div>
              {renderChildren(block.id)}
            </div>
          )
        })
      }
      case 'equation': {
        return renderBlockWithOverride(block, () => {
          const expression = block.equation.expression || ''
          return (
            <div key={block.id} className={baseClassName}>
              {expression
                ? <div className={`notion-equation-block ${stylex.props(styles.equation).className}`} dangerouslySetInnerHTML={{ __html: renderEquationHtml(expression, true) }} />
                : null}
              {renderChildren(block.id)}
            </div>
          )
        })
      }
      case 'code': {
        return renderBlockWithOverride(block, () => {
          const source = getPlainTextFromRichText(block.code.rich_text)
          const language = normalizeCodeLanguage(block.code.language || '')
          if (language === 'mermaid') {
            return (
              <div key={block.id} className={baseClassName}>
                <MermaidBlock code={source} className={stylex.props(styles.margin4).className} />
                {renderChildren(block.id)}
              </div>
            )
          }

          const highlighted = model.highlightedCodeByBlockId[block.id]
          const codeContentId = `notion-code-content-${block.id.replaceAll('-', '')}`
          return (
            <div key={block.id} className={baseClassName}>
              <div className={`notion-code-block ${stylex.props(styles.codeBlock).className}`}>
                <span className="notion-code-language notion-code-language-floating">
                  {highlighted?.displayLanguage || `${block.code.language || ''}`.trim() || 'plain text'}
                </span>
                <CodeBlockCopyButton codeSelector={`#${codeContentId} code`} />
                <div
                  id={codeContentId}
                  className="notion-code-content"
                  dangerouslySetInnerHTML={{ __html: highlighted?.html || renderFallbackHighlightedCodeHtml(source) }}
                />
              </div>
              {renderChildren(block.id)}
            </div>
          )
        })
      }
      case 'image': {
        return renderBlockWithOverride(block, () => {
          const source = block.image.type === 'external' ? block.image.external?.url : block.image.file?.url
          const caption = block.image.caption || []
          const captionText = getPlainTextFromRichText(caption)
          if (!source) {
            return <Unsupported key={block.id} block={block} className={baseClassName} message="Unsupported image source" />
          }
          return (
            <figure key={block.id} className={cn(baseClassName, stylex.props(styles.figure).className)}>
              <img src={toOgProxyImageUrl(source)} alt={captionText || 'Notion image'} loading="lazy" {...stylex.props(styles.image)} />
              {caption.length > 0 && <figcaption className={`notion-asset-caption ${stylex.props(styles.caption).className}`}>{renderRichText(caption)}</figcaption>}
              {renderChildren(block.id)}
            </figure>
          )
        })
      }
      case 'column_list':
        return renderBlockWithOverride(block, () => {
          const columns = (childrenById[block.id] || [])
            .map(id => blocksById[id])
            .filter((column): column is NotionColumnBlock => column?.type === 'column')
          return (
            <div key={block.id} className={baseClassName}>
              {columns.length > 0 ? <div {...stylex.props(styles.columns)}>{columns.map(renderColumnBlock)}</div> : renderChildren(block.id)}
            </div>
          )
        })
      case 'column':
        return renderColumnBlock(block)
      case 'toggle': {
        return renderBlockWithOverride(block, () => {
          const hasChildren = (childrenById[block.id] || []).length > 0
          return (
            <details key={block.id} className={cn(baseClassName, 'nobelium-toggle', stylex.props(styles.margin2).className, !hasChildren && 'nobelium-toggle-empty')}>
              <summary className="nobelium-toggle-summary">
                {hasChildren && (
                  <span className="nobelium-toggle-chevron" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" role="presentation">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                )}
                <span className={`nobelium-toggle-title ${stylex.props(styles.preWrap).className}`}>{renderRichText(block.toggle.rich_text)}</span>
              </summary>
              {hasChildren && <div className="nobelium-toggle-content"><div className="content">{renderChildren(block.id)}</div></div>}
            </details>
          )
        })
      }
      case 'template': {
        return renderBlockWithOverride(block, () => (
          <div key={block.id} className={baseClassName}>
            {block.template.rich_text.length ? <p className={`notion-text ${stylex.props(styles.preWrap).className}`}>{renderRichText(block.template.rich_text)}</p> : null}
            {renderChildren(block.id)}
          </div>
        ))
      }
      case 'tab': {
        return renderBlockWithOverride(block, () => {
          const tabPanels = (childrenById[block.id] || [])
            .map(id => blocksById[id])
            .filter(isParagraphBlock)
            .map((panel, index) => ({
              panel,
              index,
              childIds: childrenById[panel.id] || []
            }))
            .filter(({ childIds }) => childIds.length > 0)

          if (!tabPanels.length) return null

          return (
            <div key={block.id} className={cn(baseClassName, 'notion-tabs-block')}>
              {tabPanels.map(({ panel, index, childIds }) => {
                const inputId = `notion-tab-${block.id.replaceAll('-', '')}-${panel.id.replaceAll('-', '')}`
                const label = getPlainTextFromRichText(panel.paragraph.rich_text).trim() || `Tab ${index + 1}`
                const emoji = panel.paragraph.icon?.type === 'emoji' ? panel.paragraph.icon.emoji || '' : ''
                const iconUrl = getCalloutIconUrl(panel.paragraph.icon || null)

                return (
                  <div key={panel.id} className="notion-tab-item">
                    <input
                      id={inputId}
                      className="notion-tab-input"
                      type="radio"
                      name={`notion-tab-group-${block.id}`}
                      defaultChecked={index === 0}
                    />
                    <label htmlFor={inputId} className="notion-tab-label">
                      {emoji
                        ? <span className="notion-tab-label-icon" aria-hidden="true">{emoji}</span>
                        : iconUrl
                          ? (
                            <span className="notion-tab-label-icon" aria-hidden="true">
                              <img src={iconUrl} alt="" className="notion-tab-label-icon-image" />
                            </span>
                            )
                          : null}
                      <span className="notion-tab-label-text">{label}</span>
                    </label>
                    <div className="notion-tab-panel">
                      {renderBlockList(childIds)}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })
      }
      case 'table_of_contents':
        return renderBlockWithOverride(block, () => (
          model.toc.length
            ? (
              <nav key={block.id} className={cn(baseClassName, stylex.props(styles.tocBox).className)}>
                <p {...stylex.props(styles.tocTitle)}>Table of contents</p>
                <ul {...stylex.props(styles.tocList)}>
                  {model.toc.map(item => (
                    <li key={`${block.id}-${item.id}`} style={{ marginLeft: `${item.indentLevel * 14}px` }}>
                      <a href={`#${getHeadingAnchorId(item.id)}`} {...stylex.props(styles.tocLink)}>
                        {item.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )
            : null
        ))
      case 'link_to_page': {
        return renderBlockWithOverride(block, () => {
          const targetId = `${block.link_to_page.page_id || block.link_to_page.database_id || block.link_to_page.block_id || block.link_to_page.comment_id || ''}`.trim()
          const href = model.pageHrefMap[normalizeNotionEntityId(targetId)] || buildNotionPublicUrl(targetId)
          return (
            <div key={block.id} className={baseClassName}>
              {renderPageReferenceCard(getLinkToPageLabel(block.link_to_page), href, baseClassName, '->')}
              {renderChildren(block.id)}
            </div>
          )
        })
      }
      case 'child_page': {
        return renderBlockWithOverride(block, () => {
          const href = model.pageHrefMap[normalizeNotionEntityId(block.id)] || buildNotionPublicUrl(block.id)
          return (
            <div key={block.id} className={baseClassName}>
              {renderPageReferenceCard(`${block.child_page.title || ''}`.trim() || 'Untitled page', href, baseClassName, 'Pg')}
              {renderChildren(block.id)}
            </div>
          )
        })
      }
      case 'child_database': {
        return renderBlockWithOverride(block, () => {
          const href = model.pageHrefMap[normalizeNotionEntityId(block.id)] || buildNotionPublicUrl(block.id)
          return (
            <div key={block.id} className={baseClassName}>
              {renderPageReferenceCard(`${block.child_database.title || ''}`.trim() || 'Untitled database', href, baseClassName, 'DB')}
              {renderChildren(block.id)}
            </div>
          )
        })
      }
      case 'synced_block': {
        return renderBlockWithOverride(block, () => {
          const syncedFrom = block.synced_block.synced_from?.block_id || ''
          const hasChildren = (childrenById[block.id] || []).length > 0
          return (
            <div key={block.id} className={baseClassName}>
              {hasChildren
                ? renderChildren(block.id)
                : <div {...stylex.props(styles.unsupported, styles.margin3)}>{syncedFrom ? `Synced block (${syncedFrom.slice(0, 8)}...)` : 'Synced block'}</div>}
            </div>
          )
        })
      }
      case 'breadcrumb':
        return null
      case 'embed': {
        return renderBlockWithOverride(block, () => {
          const embedUrl = block.embed.url || ''
          const iframeUrl = resolveEmbedIframeUrl(embedUrl)
          const normalizedEmbedUrl = normalizeRichTextUrl(embedUrl)
          const caption = block.embed.caption || []
          let embedHostname = ''
          try { if (embedUrl) embedHostname = new URL(embedUrl).hostname.replace(/^www\./i, '') } catch { embedHostname = '' }
          return (
            <div key={block.id} className={baseClassName}>
              <div {...stylex.props(styles.margin4)}>
                {iframeUrl || normalizedEmbedUrl
                  ? (
                    <div className={`notion-embed-frame ${stylex.props(styles.embedFrame).className}`}>
                      {embedHostname && (
                        <div {...stylex.props(styles.embedHeader)}>
                          <span {...stylex.props(styles.embedDot)} />
                          <span {...stylex.props(styles.truncate)}>{embedHostname}</span>
                        </div>
                      )}
                      <div {...stylex.props(styles.ratioFrame)} style={{ paddingTop: '56.25%' }}>
                        <iframe
                          src={iframeUrl || normalizedEmbedUrl}
                          title={embedUrl || block.id}
                          {...stylex.props(styles.absoluteFill)}
                          allowFullScreen
                          loading="lazy"
                        />
                      </div>
                    </div>
                  )
                  : embedUrl
                    ? renderLinkPreviewCard(embedUrl, normalizeRichTextUrl(embedUrl))
                    : <Unsupported block={block} className="" message="Unsupported embed block" />}
                {caption.length > 0 && <div className={`notion-asset-caption ${stylex.props(styles.caption).className}`}>{renderRichText(caption)}</div>}
              </div>
              {renderChildren(block.id)}
            </div>
          )
        })
      }
      case 'bookmark': {
        return renderBlockWithOverride(block, () => {
          const bookmarkUrl = block.bookmark.url || ''
          const caption = block.bookmark.caption || []
          return (
            <div key={block.id} className={baseClassName}>
              {bookmarkUrl ? renderLinkPreviewCard(bookmarkUrl, normalizeRichTextUrl(bookmarkUrl)) : <Unsupported block={block} className={stylex.props(styles.margin4).className} message="Unsupported bookmark block" />}
              {caption.length > 0 && <div className={`notion-asset-caption ${stylex.props(styles.caption).className}`}>{renderRichText(caption)}</div>}
              {renderChildren(block.id)}
            </div>
          )
        })
      }
      case 'video': {
        return renderBlockWithOverride(block, () => {
          const source = getFileBlockUrl(block.video)
          const iframeUrl = resolveEmbedIframeUrl(source)
          const caption = block.video.caption || []
          return (
            <div key={block.id} className={baseClassName}>
              <div {...stylex.props(styles.margin4)}>
                {!source
                  ? <Unsupported block={block} className="" message="Unsupported video block" />
                  : iframeUrl
                    ? (
                      <div {...stylex.props(styles.mediaFrame)} style={{ paddingTop: '56.25%' }}>
                        <iframe src={iframeUrl} title={source || block.id} {...stylex.props(styles.absoluteFill)} allowFullScreen loading="lazy" />
                      </div>
                    )
                    : <video src={source} controls preload="metadata" {...stylex.props(styles.video)} />}
                {caption.length > 0 && <div className={`notion-asset-caption ${stylex.props(styles.caption).className}`}>{renderRichText(caption)}</div>}
              </div>
              {renderChildren(block.id)}
            </div>
          )
        })
      }
      case 'audio': {
        return renderBlockWithOverride(block, () => {
          const source = getFileBlockUrl(block.audio)
          const caption = block.audio.caption || []
          return (
            <div key={block.id} className={baseClassName}>
              <div {...stylex.props(styles.margin4)}>
                {!source ? <Unsupported block={block} className="" message="Unsupported audio block" /> : <audio src={source} controls preload="metadata" className="notion-audio-block" />}
                {caption.length > 0 && <div className={`notion-asset-caption ${stylex.props(styles.caption).className}`}>{renderRichText(caption)}</div>}
              </div>
              {renderChildren(block.id)}
            </div>
          )
        })
      }
      case 'pdf': {
        return renderBlockWithOverride(block, () => {
          const source = getFileBlockUrl(block.pdf)
          const caption = block.pdf.caption || []
          return (
            <div key={block.id} className={baseClassName}>
              <div {...stylex.props(styles.pdfFrame)}>
                {!source
                  ? <div {...stylex.props(styles.pdfUnsupported)}>Unsupported pdf block</div>
                  : (
                    <>
                      <iframe src={source} title={source || block.id} {...stylex.props(styles.fullWidth)} style={{ height: '620px' }} loading="lazy" />
                      <a href={source} target="_blank" rel="noopener noreferrer" {...stylex.props(styles.pdfLink)}>
                        Open PDF
                      </a>
                    </>
                  )}
              </div>
              {caption.length > 0 && <div className={`notion-asset-caption ${stylex.props(styles.caption).className}`}>{renderRichText(caption)}</div>}
              {renderChildren(block.id)}
            </div>
          )
        })
      }
      case 'file': {
        return renderBlockWithOverride(block, () => {
          const fileUrl = getFileBlockUrl(block.file)
          const caption = block.file.caption || []
          return (
            <div key={block.id} className={baseClassName}>
              {!fileUrl
                ? <Unsupported block={block} className={stylex.props(styles.margin4).className} message="Unsupported file block" />
                : (
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="notion-file-block">
                    <span className="notion-file-icon" aria-hidden="true">
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" role="presentation">
                        <path d="M6 2.75h5.5L16 7.25V16a1.75 1.75 0 0 1-1.75 1.75H6A1.75 1.75 0 0 1 4.25 16V4.5A1.75 1.75 0 0 1 6 2.75Z" />
                        <path d="M11.5 2.75V7.25H16" />
                        <path d="M7.25 11.25h5.5M7.25 14h3.5" />
                      </svg>
                    </span>
                    <span className="notion-file-name">{getFileBlockName(block.file, fileUrl)}</span>
                  </a>
                )}
              {caption.length > 0 && <div className={`notion-asset-caption ${stylex.props(styles.caption).className}`}>{renderRichText(caption)}</div>}
              {renderChildren(block.id)}
            </div>
          )
        })
      }
      case 'table': {
        return renderBlockWithOverride(block, () => {
          const rows = (childrenById[block.id] || []).map(id => blocksById[id]).filter(isTableRowBlock)
          const widthFromSchema = Number(block.table.table_width) || 0
          const widthFromRows = rows.reduce((max, row) => Math.max(max, row.table_row.cells.length), 0)
          const columnCount = Math.max(widthFromSchema, widthFromRows)
          if (!rows.length || !columnCount) return <Unsupported key={block.id} block={block} className={baseClassName} message="Unsupported table block" />

          return (
            <div key={block.id} className={baseClassName}>
              <div className={`notion-table-wrapper ${stylex.props(styles.margin4).className}`}>
                <table className="notion-table-block">
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr key={row.id || `${block.id}-${rowIndex}`}>
                        {Array.from({ length: columnCount }).map((_, colIndex) => {
                          const cellRichText = row.table_row.cells[colIndex] || []
                          const isColumnHeader = !!block.table.has_column_header && rowIndex === 0
                          const isRowHeader = !!block.table.has_row_header && colIndex === 0
                          const isHeader = isColumnHeader || isRowHeader
                          return isHeader
                            ? (
                              <th key={`${row.id || rowIndex}-${colIndex}`} className="notion-table-cell notion-table-cell-header" scope={isColumnHeader ? 'col' : 'row'}>
                                <div {...stylex.props(styles.preWrap)}>{renderRichText(cellRichText)}</div>
                              </th>
                            )
                            : (
                              <td key={`${row.id || rowIndex}-${colIndex}`} className="notion-table-cell">
                                <div {...stylex.props(styles.preWrap)}>{renderRichText(cellRichText)}</div>
                              </td>
                            )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderChildren(block.id)}
            </div>
          )
        })
      }
      case 'table_row':
        return null
      case 'link_preview': {
        return renderBlockWithOverride(block, () => (
          <div key={block.id} className={baseClassName}>
            {block.link_preview.url
              ? renderLinkPreviewCard(block.link_preview.url, normalizeRichTextUrl(block.link_preview.url))
              : <Unsupported block={block} className={stylex.props(styles.margin4).className} message="Unsupported link preview block" />}
            {renderChildren(block.id)}
          </div>
        ))
      }
      case 'divider':
        return renderBlockWithOverride(block, () => (
          <div key={block.id} className={baseClassName}>
            <hr className={`notion-hr ${stylex.props(styles.rule).className}`} />
            {renderChildren(block.id)}
          </div>
        ))
      case 'bulleted_list_item':
        return renderBulletedListItem(block)
      case 'numbered_list_item':
        return renderNumberedListItem(block)
      case 'to_do':
        return renderToDoItem(block)
      case 'unsupported':
      default:
        return renderBlockWithOverride(block, () => <Unsupported key={block.id} block={block} className={baseClassName} />)
    }
  }

  const renderBlockList = (blockIds: string[]) => {
    const nodes: ReactNode[] = []
    for (let index = 0; index < blockIds.length; index += 1) {
      const block = blocksById[blockIds[index]]
      if (!block) continue

      if (isBulletedListItemBlock(block)) {
        const listItems = [renderBulletedListItem(block)]
        while (index + 1 < blockIds.length && isBulletedListItemBlock(blocksById[blockIds[index + 1]])) {
          const nextBlock = blocksById[blockIds[index + 1]]
          if (!isBulletedListItemBlock(nextBlock)) break
          listItems.push(renderBulletedListItem(nextBlock))
          index += 1
        }
        nodes.push(<ul key={`bulleted-${block.id}`} className={`notion-list ${stylex.props(styles.bulletedList).className}`}>{listItems}</ul>)
        continue
      }

      if (isNumberedListItemBlock(block)) {
        const listItems = [renderNumberedListItem(block)]
        while (index + 1 < blockIds.length && isNumberedListItemBlock(blocksById[blockIds[index + 1]])) {
          const nextBlock = blocksById[blockIds[index + 1]]
          if (!isNumberedListItemBlock(nextBlock)) break
          listItems.push(renderNumberedListItem(nextBlock))
          index += 1
        }
        nodes.push(<ol key={`numbered-${block.id}`} className={`notion-list ${stylex.props(styles.numberedList).className}`}>{listItems}</ol>)
        continue
      }

      nodes.push(renderBlock(block))
    }
    return nodes
  }

  return (
    <div className={cn('notion', className)} style={style}>
      {renderBlockList(rootIds)}
      <ImageLightbox />
    </div>
  )
}

const styles = stylex.create({
  unsupported: {
    borderColor: colors.borderInput,
    borderRadius: '0.25rem',
    borderStyle: 'dashed',
    borderWidth: '1px',
    color: colors.textSubtle,
    fontSize: '0.875rem',
    marginBlock: '1rem',
    padding: '0.75rem'
  },
  preWrap: { whiteSpace: 'pre-wrap' },
  todoItem: { alignItems: 'baseline', display: 'flex', gap: '0.25rem' },
  todoBody: { flex: 1, minWidth: 0, whiteSpace: 'pre-wrap' },
  todoChildren: { paddingLeft: '1.75rem' },
  margin2: { marginBlock: '0.5rem' },
  margin3: { marginBlock: '0.75rem' },
  margin4: { marginBlock: '1rem' },
  referenceCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceReference,
    borderColor: colors.borderDefault,
    borderRadius: '0.375rem',
    borderStyle: 'solid',
    borderWidth: '1px',
    color: colors.textSecondary,
    display: 'inline-flex',
    fontSize: '0.875rem',
    gap: '0.5rem',
    padding: '0.375rem 0.75rem'
  },
  referenceLink: {
    borderColor: { ':hover': colors.borderFocus }
  },
  heading: {
    color: 'inherit',
    fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
    fontWeight: 600,
    scrollMarginTop: '5rem'
  },
  heading1: { fontSize: '2rem', lineHeight: 1.24, marginBottom: '0.75rem', marginTop: '3rem' },
  heading2: { fontSize: '1.62rem', lineHeight: 1.28, marginBottom: '0.5rem', marginTop: '2.5rem' },
  heading3: { fontSize: '1.34rem', lineHeight: 1.34, marginBottom: '0.375rem', marginTop: '2rem' },
  heading4: { fontSize: '1.16rem', lineHeight: 1.4, marginBottom: '0.25rem', marginTop: '1.5rem' },
  quote: {
    borderLeftColor: colors.borderStrong,
    borderLeftStyle: 'solid',
    borderLeftWidth: '4px',
    borderRadius: '0 0.375rem 0.375rem 0',
    color: colors.textSecondary,
    whiteSpace: 'pre-wrap'
  },
  callout: {
    alignItems: 'flex-start',
    borderColor: colors.borderDefault,
    borderRadius: '0.375rem',
    borderStyle: 'solid',
    borderWidth: '1px',
    display: 'flex',
    marginBlock: '1rem',
    padding: '0.5rem 0.75rem'
  },
  noShrink: { flex: 'none' },
  calloutIcon: { height: '1.05em', objectFit: 'contain', width: '1.05em' },
  equation: { marginBlock: '1rem', overflowX: 'auto', textAlign: 'center' },
  codeBlock: { marginBlock: '1.25rem', overflow: 'hidden' },
  figure: { marginBlock: '1.5rem' },
  image: {
    borderColor: colors.borderSubtle,
    borderRadius: '0.375rem',
    borderStyle: 'solid',
    borderWidth: '1px',
    width: '100%'
  },
  caption: { marginTop: '0.5rem', whiteSpace: 'pre-wrap' },
  columns: {
    display: 'flex',
    flexDirection: { default: 'column', '@media (min-width: 768px)': 'row' },
    gap: '1rem',
    marginBlock: '1rem'
  },
  tocBox: {
    borderColor: colors.borderDefault,
    borderRadius: '0.375rem',
    borderStyle: 'solid',
    borderWidth: '1px',
    marginBlock: '1rem',
    padding: '0.5rem 0.75rem'
  },
  tocTitle: {
    color: colors.textSubtle,
    fontSize: '0.75rem',
    letterSpacing: 0,
    marginBottom: '0.5rem',
    textTransform: 'uppercase'
  },
  tocList: { display: 'grid', gap: '0.25rem' },
  tocLink: {
    color: {
      default: colors.textSecondary,
      ':hover': colors.textPrimary
    },
    fontSize: '0.875rem'
  },
  embedFrame: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderSubtle,
    borderRadius: '0.375rem',
    borderStyle: 'solid',
    borderWidth: '1px',
    overflow: 'hidden'
  },
  embedHeader: {
    alignItems: 'center',
    borderBottomColor: colors.borderSubtle,
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    color: colors.textQuiet,
    display: 'flex',
    fontSize: '0.75rem',
    gap: '0.375rem',
    padding: '0.375rem 0.75rem'
  },
  embedDot: {
    backgroundColor: colors.borderStrong,
    borderRadius: '9999px',
    display: 'inline-block',
    height: '0.625rem',
    width: '0.625rem'
  },
  truncate: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  ratioFrame: { position: 'relative', width: '100%' },
  absoluteFill: { height: '100%', left: 0, position: 'absolute', top: 0, width: '100%' },
  mediaFrame: {
    borderColor: colors.borderDefault,
    borderRadius: '0.375rem',
    borderStyle: 'solid',
    borderWidth: '1px',
    overflow: 'hidden',
    position: 'relative',
    width: '100%'
  },
  video: {
    backgroundColor: colors.overlayScrim,
    borderColor: colors.borderDefault,
    borderRadius: '0.375rem',
    borderStyle: 'solid',
    borderWidth: '1px',
    width: '100%'
  },
  pdfFrame: {
    borderColor: colors.borderDefault,
    borderRadius: '0.375rem',
    borderStyle: 'solid',
    borderWidth: '1px',
    marginBlock: '1rem',
    overflow: 'hidden'
  },
  pdfUnsupported: {
    color: colors.textSubtle,
    fontSize: '0.875rem',
    padding: '0.75rem'
  },
  fullWidth: { width: '100%' },
  pdfLink: {
    borderTopColor: colors.borderDefault,
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
    color: colors.textMuted,
    display: 'block',
    fontSize: '0.875rem',
    padding: '0.5rem 0.75rem',
    textDecorationLine: { ':hover': 'underline' }
  },
  rule: {
    borderColor: colors.borderDefault,
    marginBlock: '1rem'
  },
  bulletedList: { listStyleType: 'disc', marginBlock: '0.75rem' },
  numberedList: { listStyleType: 'decimal', marginBlock: '0.75rem' }
})
