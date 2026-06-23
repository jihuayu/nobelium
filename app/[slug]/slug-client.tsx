import cn from 'classnames'
import Link from 'next/link'
import { ARTICLE_CONTENT_MAX_WIDTH_CLASS } from '@/consts'
import Post from '@/components/Post'
import type { NotionDocument, PagePreviewMap } from '@jihuayu/notion-type'
import type { PostData } from '@/lib/notion/filterPublishedPosts'
import type { LinkPreviewMap } from '@/lib/link-preview/types'
import type { PageLinkMap } from '@/lib/notion/pageLinkMap'

interface SlugPostClientProps {
  post: PostData
  document: NotionDocument
  fullWidth: boolean
  homePath: string
  backLabel: string
  topLabel: string
  linkPreviewMap?: LinkPreviewMap
  pageLinkMap?: PageLinkMap
  pagePreviewMap?: PagePreviewMap
}

export default function SlugPostClient({
  post,
  document,
  fullWidth,
  homePath,
  backLabel,
  topLabel,
  linkPreviewMap = {},
  pageLinkMap = {},
  pagePreviewMap = {}
}: SlugPostClientProps) {
  return (
    <>
      <Post
        post={post}
        document={document}
        fullWidth={fullWidth}
        linkPreviewMap={linkPreviewMap}
        pageLinkMap={pageLinkMap}
        pagePreviewMap={pagePreviewMap}
      />

      <div
        className={cn(
          'px-4 flex justify-between font-medium text-zinc-500 dark:text-zinc-400 my-5',
          fullWidth ? 'md:px-24' : `mx-auto ${ARTICLE_CONTENT_MAX_WIDTH_CLASS}`
        )}
      >
        <Link href={homePath || '/'} className="group mt-2 flex items-center gap-1.5 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors duration-150 ease-out">
          <span className="transition-transform duration-150 ease-out group-hover:-translate-x-0.5">←</span>
          {backLabel}
        </Link>
        <a href="#top" className="group mt-2 flex items-center gap-1.5 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors duration-150 ease-out">
          <span className="transition-transform duration-150 ease-out group-hover:-translate-y-0.5">↑</span>
          {topLabel}
        </a>
      </div>
    </>
  )
}
