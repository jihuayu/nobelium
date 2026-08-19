import Link from 'next/link'
import { formatDate } from '@/lib/formatDate'
import type { PostData } from '@/lib/notion/filterPublishedPosts'

const MAX_VISIBLE_TAGS = 3

interface BlogPostProps {
  post: PostData
  blogPath: string
  lang: string
  timezone?: string
}

const BlogPost = ({ post, blogPath, lang, timezone }: BlogPostProps) => {
  const href = `${blogPath}/${post.slug}`
  const tags = (post.tags || []).slice(0, MAX_VISIBLE_TAGS)
  const parsedDate = new Date(post.date)
  const dateTime = Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate.toISOString()

  return (
    <article className="mb-10 md:mb-12">
          <h2 className="text-lg md:text-2xl font-serif font-semibold mb-1.5 text-stone-900 dark:text-stone-100 tracking-tight">
        <Link
          href={href}
          prefetch={false}
          className="underline-offset-[5px] decoration-1 decoration-stone-300 dark:decoration-stone-600 hover:underline"
        >
          {post.title}
        </Link>
      </h2>
      {post.summary && (
        <p className="mb-2 line-clamp-2 leading-7 md:leading-8 text-stone-600 dark:text-stone-400">
          {post.summary}
        </p>
      )}
      <div className="flex flex-wrap items-baseline gap-x-0 text-xs text-stone-400 dark:text-stone-500">
        <time dateTime={dateTime}>
          {formatDate(post.date, lang, timezone)}
        </time>
        {tags.map((tag, index) => (
          <span key={tag} className="inline-flex items-baseline">
            <span aria-hidden="true" className="mx-1.5">·</span>
            <Link
              href={`/tag/${encodeURIComponent(tag)}`}
              prefetch={false}
              className="transition-colors duration-150 ease-out hover:text-stone-800 dark:hover:text-stone-200"
            >
              {tag}
            </Link>
            {index === MAX_VISIBLE_TAGS - 1 && (post.tags || []).length > MAX_VISIBLE_TAGS ? (
              <span className="ml-1.5">+{(post.tags || []).length - MAX_VISIBLE_TAGS}</span>
            ) : null}
          </span>
        ))}
      </div>
    </article>
  )
}

export default BlogPost
