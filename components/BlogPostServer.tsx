import Link from 'next/link'
import * as stylex from '@stylexjs/stylex'
import { config } from '@/lib/server/config'
import { formatDate } from '@/lib/formatDate'
import { blogPostStyles as styles } from '@/components/BlogPost.styles'
import type { PostData } from '@/lib/notion/filterPublishedPosts'

interface BlogPostServerProps {
  post: PostData
}

export default function BlogPostServer({ post }: BlogPostServerProps) {
  const blogPath = config.path || ''

  return (
    <Link href={`${blogPath}/${post.slug}`} prefetch={false} className={`blog-post-link ${stylex.props(styles.link).className}`}>
      <article key={post.id} {...stylex.props(styles.article)}>
        <header {...stylex.props(styles.header)}>
          <h2 className={`blog-post-title ${stylex.props(styles.title).className}`}>
            {post.title}
          </h2>
          <time {...stylex.props(styles.time)}>
            {formatDate(post.date, config.lang, config.timezone)}
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
