import cn from 'classnames'
import BlogPostServer from '@/components/BlogPostServer'
import { groupPostsByYear } from '@/lib/groupPostsByYear'
import type { PostData } from '@/lib/notion/filterPublishedPosts'

interface PostListProps {
  posts: PostData[]
  timezone?: string
}

export default function PostList({ posts, timezone }: PostListProps) {
  const groups = groupPostsByYear(posts, timezone)

  return (
    <>
      {groups.map((group, index) => (
        <section key={group.year} aria-label={group.year}>
          <p
            className={cn(
              'font-serif text-sm text-stone-400 dark:text-stone-500',
              index === 0 ? 'mb-2.5' : 'mt-8 mb-2.5'
            )}
          >
            {group.year}
          </p>
          {group.posts.map(post => (
            <BlogPostServer key={post.id} post={post} />
          ))}
        </section>
      ))}
    </>
  )
}
