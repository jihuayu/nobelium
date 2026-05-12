import cn from 'classnames'
import {
  ARTICLE_CONTENT_MAX_WIDTH_CLASS,
  ARTICLE_TOC_LEFT,
  ARTICLE_TOC_MAX_HEIGHT,
  ARTICLE_TOC_TOP_PX,
  ARTICLE_TOC_WIDTH_PX
} from '@/consts'
import { config } from '@/lib/server/config'
import { formatDate } from '@/lib/formatDate'
import TagItem from '@/components/TagItem'
import NotionRenderer from '@/components/NotionRenderer'
import TableOfContents from '@/components/TableOfContents'
import type { NotionDocument, PagePreviewMap } from '@jihuayu/notion-type'
import type { PostData } from '@/lib/notion/filterPublishedPosts'
import type { LinkPreviewMap } from '@/lib/link-preview/types'
import type { PageLinkMap } from '@/lib/notion/pageLinkMap'

interface PostProps {
  post: PostData
  document: NotionDocument
  fullWidth?: boolean
  linkPreviewMap?: LinkPreviewMap
  pageLinkMap?: PageLinkMap
  pagePreviewMap?: PagePreviewMap
}

export default function Post(props: PostProps) {
  const { post, document, fullWidth = false, linkPreviewMap = {}, pageLinkMap = {}, pagePreviewMap = {} } = props
  const isPost = post.type[0] !== 'Page'

  return (
    <article className={cn('flex flex-col', fullWidth ? 'md:px-24' : 'items-center')}>
      <header
        className={cn(
          'blog-post-hero w-full',
          !fullWidth && `${ARTICLE_CONTENT_MAX_WIDTH_CLASS} px-4`
        )}
      >
        <h1 className="font-bold text-3xl text-black dark:text-zinc-100">
          {post.title}
        </h1>
        {isPost && (
          <nav className="flex mt-7 items-start text-gray-500 dark:text-gray-400">
            <div className="flex mb-4">
              <a href={config.socialLink || '#'} className="flex">
                <p className="ml-2 md:block">{config.author}</p>
              </a>
              <span className="block">&nbsp;/&nbsp;</span>
            </div>
            <time className="mr-2 mb-4 md:ml-0">
              {formatDate(post.date, config.lang, config.timezone)}
            </time>
            {post.tags && (
              <div className="flex flex-nowrap max-w-full overflow-x-auto article-tags">
                {post.tags.map(tag => (
                  <TagItem key={tag} tag={tag} />
                ))}
              </div>
            )}
          </nav>
        )}
        {isPost && post.summary && (
          <p className="blog-post-summary mb-8 leading-8 text-gray-700 dark:text-gray-300">
            {post.summary}
          </p>
        )}
      </header>
      <div className="blog-post-body self-stretch -mt-4 relative">
        <div className={fullWidth ? 'w-full px-4 md:px-24' : `mx-auto w-full ${ARTICLE_CONTENT_MAX_WIDTH_CLASS} px-4`}>
          <NotionRenderer document={document} linkPreviewMap={linkPreviewMap} pageLinkMap={pageLinkMap} pagePreviewMap={pagePreviewMap} />
        </div>
        {!fullWidth && (
          <div
            className="hidden xl:block absolute top-0 bottom-0"
            style={{
              left: ARTICLE_TOC_LEFT,
              width: `${ARTICLE_TOC_WIDTH_PX}px`
            }}
          >
            <TableOfContents
              toc={document?.toc || []}
              className="sticky pt-3 overflow-y-auto"
              style={{ top: `${ARTICLE_TOC_TOP_PX}px`, maxHeight: `min(${ARTICLE_TOC_MAX_HEIGHT}, 100%)` }}
            />
          </div>
        )}
      </div>
    </article>
  )
}
