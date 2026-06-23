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
  return (
    <Link href={`${blogPath}/${post.slug}`} prefetch={false} className="group block">
      <article key={post.id} className="mb-10 md:mb-12">
        <header className="flex flex-col justify-between md:flex-row md:items-baseline md:gap-6">
          <h2 className="text-lg md:text-xl font-semibold mb-1.5 cursor-pointer text-stone-900 dark:text-stone-100 tracking-tight underline-offset-[5px] decoration-1 decoration-stone-300 dark:decoration-stone-600 group-hover:underline">
            {post.title}
          </h2>
          <time className="flex-shrink-0 text-sm tabular-nums tracking-wide text-stone-400 dark:text-stone-500">
            {formatDate(post.date, lang, timezone)}
          </time>
        </header>
        <main>
          <p className="hidden md:block leading-8 text-stone-600 dark:text-stone-400">
            {post.summary}
          </p>
        </main>
      </article>
    </Link>
  )
}

export default BlogPost
