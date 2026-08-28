import cn from 'classnames'
import Link from 'next/link'
import * as stylex from '@stylexjs/stylex'
import Post from '@/components/Post'
import ReadingProgress from '@/components/ReadingProgress'
import { appStyles } from '@/styles/app.stylex'
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
      <ReadingProgress />
      <Post
        post={post}
        document={document}
        fullWidth={fullWidth}
        linkPreviewMap={linkPreviewMap}
        pageLinkMap={pageLinkMap}
        pagePreviewMap={pagePreviewMap}
      />

      <div {...stylex.props(styles.navigation, fullWidth ? appStyles.wideContentWidth : appStyles.contentWidth)}>
        <Link href={homePath || '/'} className={cn('direction-link direction-link-back', stylex.props(appStyles.action, styles.link).className)}>
          <span className={cn('direction-arrow', stylex.props(styles.arrow).className)}>←</span>
          {backLabel}
        </Link>
        <a href="#top" className={cn('direction-link direction-link-top', stylex.props(appStyles.action, styles.link).className)}>
          <span className={cn('direction-arrow', stylex.props(styles.arrow).className)}>↑</span>
          {topLabel}
        </a>
      </div>
    </>
  )
}

const styles = stylex.create({
  navigation: {
    display: 'flex',
    fontWeight: 500,
    justifyContent: 'space-between',
    margin: '1.25rem auto',
    paddingInline: '1rem',
    width: '100%'
  },
  link: {
    alignItems: 'center',
    display: 'flex',
    gap: '0.375rem',
    marginTop: '0.5rem'
  },
  arrow: {
    transitionDuration: '150ms',
    transitionProperty: 'transform',
    transitionTimingFunction: 'ease-out'
  }
})
