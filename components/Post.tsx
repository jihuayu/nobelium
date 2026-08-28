import cn from 'classnames'
import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/theme.stylex'
import {
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
import WideTableOfContents from '@/components/WideTableOfContents'
import type { NotionDocument, PagePreviewMap } from '@jihuayu/notion-type'
import type { PostData } from '@/lib/notion/filterPublishedPosts'
import type { LinkPreviewMap } from '@/lib/link-preview/types'
import type { PageLinkMap } from '@/lib/notion/pageLinkMap'
import { getPostFormatClassNames } from '@/lib/postFormat'
import { appStyles } from '@/styles/app.stylex'

interface PostProps {
  post: PostData
  document: NotionDocument
  fullWidth?: boolean
  linkPreviewMap?: LinkPreviewMap
  pageLinkMap?: PageLinkMap
  pagePreviewMap?: PagePreviewMap
}

export { getPostFormatClassNames } from '@/lib/postFormat'

export default function Post(props: PostProps) {
  const { post, document, fullWidth = false, linkPreviewMap = {}, pageLinkMap = {}, pagePreviewMap = {} } = props
  return (
    <article className={cn(stylex.props(styles.article).className, getPostFormatClassNames(post))}>
      <h1 className={cn(
        stylex.props(styles.title, fullWidth ? appStyles.wideContentWidth : appStyles.contentWidth).className
      )}>
        {post.title}
      </h1>
      {post.type[0] !== 'Page' && (
        <nav className={cn(
          stylex.props(styles.meta, fullWidth ? appStyles.wideContentWidth : appStyles.contentWidth).className
        )}>
          <div {...stylex.props(styles.metaGroup)}>
            <a href={config.socialLink || '#'} {...stylex.props(styles.authorLink)}>
              <p {...stylex.props(styles.author)}>{config.author}</p>
            </a>
            <span {...stylex.props(styles.block)}>&nbsp;/&nbsp;</span>
          </div>
          <div {...stylex.props(styles.date)}>
            {formatDate(post.date, config.lang, config.timezone)}
          </div>
          {post.tags && (
            <div className={`article-tags ${stylex.props(styles.tags).className}`}>
              {post.tags.map(tag => (
                <TagItem key={tag} tag={tag} />
              ))}
            </div>
          )}
        </nav>
      )}
      <div {...stylex.props(styles.contentArea)}>
        <div {...stylex.props(styles.content, fullWidth ? appStyles.wideContentWidth : appStyles.contentWidth)}>
          <NotionRenderer document={document} linkPreviewMap={linkPreviewMap} pageLinkMap={pageLinkMap} pagePreviewMap={pagePreviewMap} />
        </div>
        {!fullWidth && (
          <div
            {...stylex.props(styles.tocRail)}
            style={{
              left: ARTICLE_TOC_LEFT,
              width: `${ARTICLE_TOC_WIDTH_PX}px`
            }}
          >
            <TableOfContents
              toc={document?.toc || []}
              className={stylex.props(styles.toc).className}
              style={{ top: `${ARTICLE_TOC_TOP_PX}px`, maxHeight: `min(${ARTICLE_TOC_MAX_HEIGHT}, 100%)` }}
            />
          </div>
        )}
        {fullWidth && <WideTableOfContents toc={document?.toc || []} />}
      </div>
    </article>
  )
}

const styles = stylex.create({
  article: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column'
  },
  title: {
    color: colors.textPrimary,
    fontFamily: 'var(--font-source-serif-4), var(--font-noto-serif-sc), "Source Serif", ui-serif, Georgia, serif',
    fontSize: '2rem',
    fontWeight: 600,
    letterSpacing: 0,
    lineHeight: 1.25,
    paddingInline: '1rem',
    width: '100%'
  },
  meta: {
    alignItems: 'flex-start',
    color: colors.textQuiet,
    display: 'flex',
    fontSize: '0.875rem',
    marginTop: '1.5rem',
    paddingInline: '1rem',
    width: '100%'
  },
  metaGroup: {
    display: 'flex',
    marginBottom: '1rem'
  },
  authorLink: {
    color: {
      ':hover': colors.textSecondary
    },
    display: 'flex',
    transitionDuration: '150ms',
    transitionProperty: 'color',
    transitionTimingFunction: 'ease-out'
  },
  author: {
    display: {
      '@media (min-width: 768px)': 'block'
    },
    marginLeft: '0.5rem'
  },
  block: { display: 'block' },
  date: {
    marginBottom: '1rem',
    marginLeft: {
      '@media (min-width: 768px)': 0
    },
    marginRight: '0.5rem'
  },
  tags: {
    display: 'flex',
    flexWrap: 'nowrap',
    maxWidth: '100%',
    overflowX: 'auto'
  },
  contentArea: {
    alignSelf: 'stretch',
    marginTop: '-1rem',
    position: 'relative'
  },
  content: {
    marginInline: 'auto',
    paddingInline: '1rem',
    width: '100%'
  },
  tocRail: {
    bottom: 0,
    display: {
      default: 'none',
      '@media (min-width: 1280px)': 'block'
    },
    position: 'absolute',
    top: 0
  },
  toc: {
    overflowY: 'auto',
    paddingTop: '0.75rem',
    position: 'sticky'
  }
})
