import type { CSSProperties, ComponentType, ReactNode } from 'react'
import type {
  LinkPreviewData,
  LinkPreviewMap,
  NotionBlock,
  NotionBlockBase,
  NotionBlockType,
  NotionDocument,
  NotionRichText,
  PageHrefEntry,
  PageHrefMap,
  PagePreviewMap,
  TocItem
} from '@jihuayu/notion-type'

export type {
  LinkPreviewData,
  LinkPreviewMap,
  NotionAudioBlock,
  NotionBlock,
  NotionBlockBase,
  NotionBlockIcon,
  NotionBlockType,
  NotionBookmarkBlock,
  NotionBulletedListItemBlock,
  NotionCalloutBlock,
  NotionChildDatabaseBlock,
  NotionChildPageBlock,
  NotionCodeBlock,
  NotionColumnBlock,
  NotionColumnListBlock,
  NotionDocument,
  NotionEmbedBlock,
  NotionEquationBlock,
  NotionFileBlock,
  NotionHeadingPayload,
  NotionHeading1Block,
  NotionHeading2Block,
  NotionHeading3Block,
  NotionHeading4Block,
  NotionImageBlock,
  NotionLinkPreviewBlock,
  NotionLinkToPageBlock,
  NotionNumberedListItemBlock,
  NotionParagraphBlock,
  NotionPdfBlock,
  NotionQuoteBlock,
  NotionRichText,
  NotionRichTextDateMention,
  NotionRichTextEquation,
  NotionRichTextLinkMention,
  NotionRichTextLinkPreviewMention,
  NotionRichTextText,
  NotionSyncedBlock,
  NotionTabBlock,
  NotionTableBlock,
  NotionTableRowBlock,
  NotionTemplateBlock,
  NotionTextAnnotations,
  NotionToDoBlock,
  NotionToggleBlock,
  NotionUnsupportedBlock,
  NotionVideoBlock,
  PageHrefEntry,
  PageHrefMap,
  PagePreviewMap,
  TocItem
} from '@jihuayu/notion-type'

import type {
  HighlightCodeResolver,
  HighlightedCode,
  HighlightedCodeByBlockId,
  LinkPreviewResolver,
  NotionRenderModel,
  PageHrefResolver,
  PrepareNotionRenderModelOptions
} from '@jihuayu/notion-render-core'

export type {
  HighlightCodeResolver,
  HighlightedCode,
  HighlightedCodeByBlockId,
  LinkPreviewResolver,
  NotionRenderModel,
  PageHrefResolver,
  PrepareNotionRenderModelOptions
} from '@jihuayu/notion-render-core'

export type DateMentionDisplayMode = 'notion' | 'relative' | 'absolute'
export type DateMentionIncludeTimeMode = 'auto' | 'always' | 'never'
export type DateMentionRelativeStyle = 'long' | 'short' | 'narrow'

export interface DateMentionOptions {
  displayMode?: DateMentionDisplayMode
  includeTime?: DateMentionIncludeTimeMode
  absoluteDateFormat?: string
  absoluteDateTimeFormat?: string
  relativeStyle?: DateMentionRelativeStyle
}

export interface NotionRenderOptions {
  locale?: string
  timeZone?: string
  dateMention?: DateMentionOptions
}

export interface ResolvedNotionRenderOptions {
  locale: string
  timeZone: string
  dateMention: {
    displayMode: DateMentionDisplayMode
    includeTime: DateMentionIncludeTimeMode
    absoluteDateFormat: string
    absoluteDateTimeFormat: string
    relativeStyle: DateMentionRelativeStyle
  }
}

export interface DateMentionProps {
  start: string
  end?: string
  timeZone?: string
  locale: string
  displayMode: DateMentionDisplayMode
  includeTime: DateMentionIncludeTimeMode
  absoluteDateFormat: string
  absoluteDateTimeFormat: string
  relativeStyle: DateMentionRelativeStyle
  fallbackText?: string
}

export interface UrlMentionPreviewData {
  href: string
  title: string
  description: string
  icon: string
  image: string
  provider: string
}

export interface UrlMentionProps {
  href: string
  label: string
  iconUrl?: string
  preview: UrlMentionPreviewData | null
  isGithub: boolean
  variant?: 'mention' | 'inline'
  children?: ReactNode
}

export interface MermaidBlockProps {
  code: string
  className?: string
}

export interface LinkPreviewCardProps {
  url: string
  className?: string
  preview?: LinkPreviewData | null
}

export interface UnsupportedBlockProps {
  block: NotionBlock
  className?: string
  message?: string
}

export interface BlockRendererProps {
  block: NotionBlock
  model: NotionRenderModel
  renderOptions: ResolvedNotionRenderOptions
  renderChildren: (blockId: string) => ReactNode
  renderRichText: (richText?: NotionRichText[]) => ReactNode
}

export type BlockRenderer = (props: BlockRendererProps) => ReactNode

export interface NotionRendererComponents {
  blocks?: Partial<Record<NotionBlockType, BlockRenderer>>
  leaves?: Partial<{
    DateMention: ComponentType<DateMentionProps>
    UrlMention: ComponentType<UrlMentionProps>
    MermaidBlock: ComponentType<MermaidBlockProps>
    LinkPreviewCard: ComponentType<LinkPreviewCardProps>
    UnsupportedBlock: ComponentType<UnsupportedBlockProps>
  }>
}

export interface NotionRendererProps {
  model: NotionRenderModel
  components?: NotionRendererComponents
  renderOptions?: NotionRenderOptions
  className?: string
  style?: CSSProperties
}
