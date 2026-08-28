import cn from 'classnames'
import * as stylex from '@stylexjs/stylex'
import { CommentBox } from '@jihuayu/somnium-comments'
import { appStyles } from '@/styles/app.stylex'
import { config } from '@/lib/server/config'
import type { BlogConfig } from '@/lib/config'
import type { PostData } from '@/lib/notion/filterPublishedPosts'
import { buildInternalSlugHref } from '@/lib/notion/pageLinkMap'

interface CommentsProps {
  frontMatter: PostData
  comment: BlogConfig['comment']
}

function buildCommentPageUrl(slug: string): string | undefined {
  const siteUrl = `${config.link || ''}`.trim()
  if (!siteUrl) return undefined

  try {
    return new URL(buildInternalSlugHref(config.path || '', slug), siteUrl).toString()
  } catch {
    return undefined
  }
}

const Comments = ({ frontMatter, comment }: CommentsProps) => {
  const fullWidth = frontMatter.fullWidth ?? false
  const atriumConfig = comment?.atriumConfig
  const commentPageUrl = buildCommentPageUrl(frontMatter.slug)

  if (!comment || comment.provider !== 'atrium') return null

  return (
    <CommentBox
      key={frontMatter.id}
      websiteKey={atriumConfig?.websiteKey}
      pageKey={frontMatter.id}
      endpoint={atriumConfig?.endpoint}
      pageTitle={frontMatter.title}
      pageUrl={commentPageUrl}
      locale={config.lang}
      className={cn(
        stylex.props(styles.root, fullWidth ? appStyles.wideContentWidth : appStyles.contentWidth).className
      )}
    />
  )
}

export default Comments

const styles = stylex.create({
  root: {
    marginInline: 'auto',
    paddingInline: '1rem'
  }
})
