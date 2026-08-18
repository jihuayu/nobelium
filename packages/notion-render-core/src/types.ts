import type {
  LinkPreviewData,
  LinkPreviewMap,
  NotionDocument,
  PageHrefMap,
  PagePreviewMap,
  TocItem
} from '@jihuayu/notion-type'

export interface HighlightedCode {
  html: string
  language: string
  displayLanguage: string
}

export type HighlightedCodeByBlockId = Record<string, HighlightedCode>

export interface NotionRenderModel {
  document: NotionDocument
  toc: TocItem[]
  highlightedCodeByBlockId: HighlightedCodeByBlockId
  linkPreviewMap: LinkPreviewMap
  pageHrefMap: PageHrefMap
  pagePreviewMap: PagePreviewMap
}

export type HighlightCodeResolver = (
  source: string,
  language: string
) => Promise<{ html: string, displayLanguage?: string } | null>

export type LinkPreviewResolver = (url: string) => Promise<LinkPreviewData | null>
export type PageHrefResolver = (id: string) => string | null | Promise<string | null>

export interface PrepareNotionRenderModelOptions {
  highlightCode?: HighlightCodeResolver
  resolveLinkPreview?: LinkPreviewResolver
  resolvePageHref?: PageHrefResolver
  initialLinkPreviewMap?: LinkPreviewMap
  initialPageHrefMap?: PageHrefMap
  initialPagePreviewMap?: PagePreviewMap
}

export type { LinkPreviewData, LinkPreviewMap, NotionDocument, PageHrefMap, PagePreviewMap, TocItem }
