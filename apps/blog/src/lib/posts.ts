import { createNotionClientFromEnv, queryAllDataSourceEntries } from '@jihuayu/notion-data'
import { mapNotionPageToPost, normalizeNotionUuid } from '@/lib/notion/postAdapter'
import * as publishedPosts from '@/lib/notion/filterPublishedPosts'
import type { PostData } from '@/lib/notion/filterPublishedPosts'
import { config as BLOG } from '@/lib/server/config'

function asFilter(value: unknown): ((args: { posts: PostData[], includePages: boolean }) => PostData[]) | null {
  if (typeof value === 'function') return value as (args: { posts: PostData[], includePages: boolean }) => PostData[]
  if (value && typeof value === 'object' && 'default' in value) return asFilter((value as { default: unknown }).default)
  return null
}

function filterPublishedPosts(args: { posts: PostData[], includePages: boolean }): PostData[] {
  const filter = asFilter(publishedPosts.filterPublishedPosts) || asFilter(publishedPosts)
  if (!filter) {
    throw new TypeError('filterPublishedPosts export is not callable')
  }
  return filter(args)
}

let cachedPosts: PostData[] | null = null
let cachedPages: PostData[] | null = null

async function fetchPosts(includePages: boolean): Promise<PostData[]> {
  const dataSourceId = normalizeNotionUuid(process.env.NOTION_DATA_SOURCE_ID)
  const integrationToken = `${process.env.NOTION_INTEGRATION_TOKEN || ''}`.trim()
  if (!dataSourceId || !integrationToken) {
    console.warn('[blog] Missing NOTION_DATA_SOURCE_ID or NOTION_INTEGRATION_TOKEN — building with empty content.')
    return []
  }

  const apiClient = createNotionClientFromEnv()
  const data = await queryAllDataSourceEntries(apiClient, {
    dataSourceId,
    mapPage: mapNotionPageToPost,
    filterEntry: post => Boolean(post?.id),
    sortEntries: BLOG.sortByDate ? (left, right) => right.date - left.date : undefined
  })

  return filterPublishedPosts({ posts: data, includePages })
}

export async function getAllPosts({ includePages = false }: { includePages?: boolean } = {}): Promise<PostData[]> {
  if (includePages) {
    if (!cachedPages) cachedPages = await fetchPosts(true)
    return cachedPages.slice()
  }
  if (!cachedPosts) cachedPosts = await fetchPosts(false)
  return cachedPosts.slice()
}

export function resetPostsCacheForTests() {
  cachedPosts = null
  cachedPages = null
}
