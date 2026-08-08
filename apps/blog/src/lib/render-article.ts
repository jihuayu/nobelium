import { prepareNotionRenderModel } from '@jihuayu/notion-render-core'
import { buildNotionDocument } from '@jihuayu/notion-data'
import { createNotionClientFromEnv } from '@jihuayu/notion-data'
import { highlightCodeToHtml } from '@/lib/server/shiki'
import { getLinkPreviewByNormalizedUrl } from '@/lib/server/linkPreview'
import { resolvePageHref } from '@/lib/notion/pageLinkMap'
import type { PageHrefMap, PagePreviewMap } from '@jihuayu/notion-type'

export async function loadArticleRenderModel(
  pageId: string,
  pageLinkMap: PageHrefMap,
  pagePreviewMap: PagePreviewMap
) {
  const client = createNotionClientFromEnv()
  const document = await buildNotionDocument(client, pageId)
  return prepareNotionRenderModel(document, {
    highlightCode: async (source, language) => {
      const highlighted = await highlightCodeToHtml(source, language)
      if (!highlighted) return null
      return { html: highlighted.html, displayLanguage: highlighted.displayLanguage }
    },
    resolveLinkPreview: url => getLinkPreviewByNormalizedUrl(url),
    resolvePageHref: id => resolvePageHref(id, pageLinkMap),
    initialPageHrefMap: pageLinkMap,
    initialPagePreviewMap: pagePreviewMap
  })
}
