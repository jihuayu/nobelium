import { NotionRenderer } from '@jihuayu/notion-react'
import type { NotionRenderModel, NotionRenderOptions } from '@jihuayu/notion-react'

export interface NotionArticleProps {
  model: NotionRenderModel
  className?: string
  renderOptions?: NotionRenderOptions
}

/**
 * Server-only React bridge for Astro. Render without `client:*` so no hydration JS is sent.
 */
export default function NotionArticle({ model, className, renderOptions }: NotionArticleProps) {
  if (!model) return null
  return <NotionRenderer model={model} className={className} renderOptions={renderOptions} />
}

export { NotionRenderer }
export type { NotionRenderModel, NotionRenderOptions }
