import Link from 'next/link'
import { formatDate } from '@/lib/formatDate'
import type { PostData } from '@/lib/notion/filterPublishedPosts'

const MAX_LIST_TAGS = 2

interface BlogPostProps {
  post: PostData
  blogPath: string
  lang: string
  timezone?: string
}

const BlogPost = ({ post, blogPath, lang, timezone }: BlogPostProps) => {
  const href = `${blogPath}/${post.slug}`
  const tags = (post.tags || []).slice(0, MAX_LIST_TAGS)
  const parsedDate = new Date(post.date)
  const dateTime = Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate.toISOString()

  return (
    <article className="relative mb-10 md:mb-12">
      <header className="flex flex-col justify-between md:flex-row md:items-baseline md:gap-6">
        <h2 className="mb-1.5 font-serif text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100 md:text-2xl">
          <Link
            href={href}
            prefetch={false}
            className="cursor-pointer underline-offset-[5px] decoration-1 decoration-stone-300 after:absolute after:inset-0 hover:underline dark:decoration-stone-600"
          >
            {post.title}
          </Link>
        </h2>
        <div className="flex shrink-0 items-baseline gap-x-3 overflow-hidden text-xs text-stone-400 dark:text-stone-500">
          <time dateTime={dateTime} className="shrink-0 tabular-nums">
            {formatDate(post.date, lang, timezone)}
          </time>
          {tags.length > 0 && (
            <ul className="relative z-10 flex min-w-0 flex-nowrap items-baseline gap-x-3 overflow-hidden">
              {tags.map(tag => (
                <li key={tag} className="shrink-0">
                  <Link
                    href={`/tag/${encodeURIComponent(tag)}`}
                    prefetch={false}
                    className="block max-w-[7em] truncate transition-colors duration-150 ease-out hover:text-stone-800 dark:hover:text-stone-200"
                  >
                    {tag}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>
      {post.summary && (
        <p className="hidden leading-8 text-stone-600 dark:text-stone-400 md:block">
          {post.summary}
        </p>
      )}
    </article>
  )
}

export default BlogPost
