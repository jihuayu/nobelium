import type { PostData } from '@/lib/notion/filterPublishedPosts'

export interface PostYearGroup {
  year: string
  posts: PostData[]
}

export function getPostYear(date: number | string, timezone?: string): string {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    ...(timezone ? { timeZone: timezone } : {})
  }).format(parsed)
}

export function groupPostsByYear(posts: PostData[], timezone?: string): PostYearGroup[] {
  const groups: PostYearGroup[] = []

  for (const post of posts) {
    const year = getPostYear(post.date, timezone)
    if (!year) continue

    const last = groups[groups.length - 1]
    if (!last || last.year !== year) {
      groups.push({ year, posts: [post] })
    } else {
      last.posts.push(post)
    }
  }

  return groups
}
