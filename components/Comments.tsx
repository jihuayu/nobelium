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

  if (!comment || comment.provider !== 'atrium' || !atriumConfig?.owner || !atriumConfig.repo) return null

  return (
    <CommentBox
      owner={atriumConfig.owner}
      repo={atriumConfig.repo}
      threadKey={frontMatter.id}
      endpoint={atriumConfig.endpoint}
      documentTitle={frontMatter.title}
      documentDescription={frontMatter.summary}
      locale={config.lang}
      className={cn(
        'px-4',
        `mx-auto ${contentWidthClass}`
      )}
    />
  )
}

export default Comments
