import Link from 'next/link'
import * as stylex from '@stylexjs/stylex'
import { formatDate } from '@/lib/formatDate'
import { blogPostStyles as styles } from '@/components/BlogPost.styles'
import type { PostData } from '@/lib/notion/filterPublishedPosts'

interface BlogPostProps {
  post: PostData
  blogPath: string
  lang: string
  timezone?: string
}

const BlogPost = ({ post, blogPath, lang, timezone }: BlogPostProps) => {
  return (
    <Link href={`${blogPath}/${post.slug}`} prefetch={false} className={`blog-post-link ${stylex.props(styles.link).className}`}>
      <article key={post.id} {...stylex.props(styles.article)}>
        <header {...stylex.props(styles.header)}>
          <h2 className={`blog-post-title ${stylex.props(styles.title).className}`}>
            {post.title}
          </h2>
          <time {...stylex.props(styles.time)}>
            {formatDate(post.date, lang, timezone)}
          </time>
        </header>
        <main>
          <p {...stylex.props(styles.summary)}>
            {post.summary}
          </p>
        </main>
      </article>
    </Link>
  )
}

export default BlogPost
