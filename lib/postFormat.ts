import type { PostData } from '@/lib/notion/filterPublishedPosts'

export function getPostFormatClassNames(post: Pick<PostData, 'formats'>): string[] {
  const formats = new Set(post.formats || [])
  return [
    formats.has('wide') ? 'notion-post-format-wide' : '',
    formats.has('codeHeavy') ? 'notion-post-format-code-heavy' : ''
  ].filter(Boolean)
}
