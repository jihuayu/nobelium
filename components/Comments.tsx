import cn from 'classnames'
import { ARTICLE_CONTENT_MAX_WIDTH_CLASS, ARTICLE_WIDE_CONTENT_MAX_WIDTH_CLASS } from '@/consts'
import DeferredComments from '@/components/DeferredComments'
import type { BlogConfig } from '@/lib/config'
import type { PostData } from '@/lib/notion/filterPublishedPosts'

interface CommentsProps {
  frontMatter: PostData
  comment: BlogConfig['comment']
  appearance: BlogConfig['appearance']
}

const Comments = ({ frontMatter, comment, appearance }: CommentsProps) => {
  const fullWidth = frontMatter.fullWidth ?? false
  const contentWidthClass = fullWidth ? ARTICLE_WIDE_CONTENT_MAX_WIDTH_CLASS : ARTICLE_CONTENT_MAX_WIDTH_CLASS
  const utterancesRepo = comment?.utterancesConfig?.repo

  if (!comment || comment.provider !== 'utterances' || !utterancesRepo) return null

  return (
    <section
      className={cn(
        'px-4 font-medium text-stone-500 dark:text-stone-400 my-5',
        `mx-auto ${contentWidthClass}`
      )}
    >
      <DeferredComments issueTerm={frontMatter.id} repo={utterancesRepo} appearance={appearance} />
    </section>
  )
}

export default Comments
