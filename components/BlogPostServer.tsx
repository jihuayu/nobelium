import Link from 'next/link'
import { config } from '@/lib/server/config'
import { formatDate } from '@/lib/formatDate'
import type { PostData } from '@/lib/notion/filterPublishedPosts'

interface BlogPostServerProps {
  post: PostData
}

export default function BlogPostServer({ post }: BlogPostServerProps) {
  const blogPath = config.path || ''

  return (
    <Link href={`${blogPath}/${post.slug}`} prefetch={false} className="group block">
      <article key={post.id} className="mb-10 md:mb-12">
        <header className="flex flex-col justify-between md:flex-row md:items-baseline md:gap-6">
          <h2 className="text-lg md:text-xl font-semibold mb-1.5 cursor-pointer text-zinc-900 dark:text-zinc-100 tracking-tight underline-offset-[5px] decoration-1 decoration-zinc-300 dark:decoration-zinc-600 group-hover:underline">
            {post.title}
          </h2>
          <time className="flex-shrink-0 text-sm tabular-nums tracking-wide text-zinc-400 dark:text-zinc-500">
            {formatDate(post.date, config.lang, config.timezone)}
          </time>
        </header>
        <main>
          <p className="hidden md:block leading-8 text-zinc-600 dark:text-zinc-400">
            {post.summary}
          </p>
        </main>
      </article>
    </Link>
  )
}
