import { CommentBox } from '@jihuayu/somnium-comments'
import { config } from '@/lib/server/config'
import { ARTICLE_CONTENT_MAX_WIDTH_CLASS, ARTICLE_WIDE_CONTENT_MAX_WIDTH_CLASS } from '@/consts'
import cn from 'classnames'

interface CommentsIslandProps {
  pageId: string
  title: string
  slug: string
  fullWidth?: boolean
  locale: string
}

function buildCommentPageUrl(slug: string): string | undefined {
  const siteUrl = `${config.link || ''}`.trim()
  if (!siteUrl) return undefined
  try {
    return new URL(slug.startsWith('/') ? slug : `/${slug}`, siteUrl).toString()
  } catch {
    return undefined
  }
}

export default function CommentsIsland({
  pageId,
  title,
  slug,
  fullWidth = false,
  locale
}: CommentsIslandProps) {
  if (config.comment?.provider !== 'atrium') return null
  const atriumConfig = config.comment.atriumConfig
  const contentWidthClass = fullWidth ? ARTICLE_WIDE_CONTENT_MAX_WIDTH_CLASS : ARTICLE_CONTENT_MAX_WIDTH_CLASS

  return (
    <CommentBox
      key={pageId}
      websiteKey={atriumConfig?.websiteKey}
      pageKey={pageId}
      endpoint={atriumConfig?.endpoint}
      pageTitle={title}
      pageUrl={buildCommentPageUrl(slug)}
      locale={locale}
      className={cn('mx-auto px-4', contentWidthClass)}
    />
  )
}
