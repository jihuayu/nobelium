import Link from 'next/link'
import { formatDate } from '@/lib/formatDate'
import type { PostData } from '@/lib/notion/filterPublishedPosts'

interface BlogPostProps {
  post: PostData
  blogPath: string
  lang: string
  timezone?: string
}

const BlogPost = ({ post, blogPath, lang, timezone }: BlogPostProps) => {
  const tags = post.tags || []
  const parsedDate = new Date(post.date)
  const dateTime = Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate.toISOString()

  return (
    <article className="mb-10 md:mb-12">
      <Link href={`${blogPath}/${post.slug}`} prefetch={false} className="group block">
        <header className="flex flex-col justify-between md:flex-row md:items-baseline md:gap-6">
          <h2 className="text-lg md:text-2xl font-serif font-semibold mb-1.5 cursor-pointer text-stone-900 dark:text-stone-100 tracking-tight underline-offset-[5px] decoration-1 decoration-stone-300 dark:decoration-stone-600 group-hover:underline">
            {post.title}
          </h2>
          <time dateTime={dateTime} className="flex-shrink-0 text-xs tabular-nums text-stone-400 dark:text-stone-500">
            {formatDate(post.date, lang, timezone)}
          </time>
        </header>
        {post.summary && (
          <p className="hidden md:block leading-8 text-stone-600 dark:text-stone-400">
            {post.summary}
          </p>
        )}
      </Link>
      {tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-400 dark:text-stone-500">
          {tags.map(tag => (
            <li key={tag}>
              <Link
                href={`/tag/${encodeURIComponent(tag)}`}
                prefetch={false}
                className="transition-colors duration-150 ease-out hover:text-stone-800 dark:hover:text-stone-200"
              >
                {tag}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

export default BlogPost
