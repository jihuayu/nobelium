import cn from 'classnames'
import { CommentBox } from '@jihuayu/somnium-comments'
import { ARTICLE_CONTENT_MAX_WIDTH_CLASS, ARTICLE_WIDE_CONTENT_MAX_WIDTH_CLASS } from '@/consts'
import { config } from '@/lib/server/config'
import type { BlogConfig } from '@/lib/config'
import type { PostData } from '@/lib/notion/filterPublishedPosts'

interface CommentsProps {
  frontMatter: PostData
  comment: BlogConfig['comment']
}

const Comments = ({ frontMatter, comment }: CommentsProps) => {
  const fullWidth = frontMatter.fullWidth ?? false
  const contentWidthClass = fullWidth ? ARTICLE_WIDE_CONTENT_MAX_WIDTH_CLASS : ARTICLE_CONTENT_MAX_WIDTH_CLASS
  const atriumConfig = comment?.atriumConfig

  if (!comment || comment.provider !== 'atrium') return null

  return (
    <CommentBox
      websiteKey={atriumConfig?.websiteKey}
      pageKey={frontMatter.id}
      endpoint={atriumConfig?.endpoint}
      pageTitle={frontMatter.title}
      locale={config.lang}
      className={cn(
        'px-4',
        `mx-auto ${contentWidthClass}`
      )}
    />
  )
}

export default Comments
