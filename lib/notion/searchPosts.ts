import { config as BLOG } from '@/lib/server/config'
import {
  tokenizeSearchQuery,
  type NotionClient
} from '@jihuayu/notion-data'
import {
  MAX_SEARCH_KEYWORD_TOKENS,
  MAX_SEARCH_TOKEN_LENGTH,
  MIN_SEARCH_QUERY_LENGTH
} from '@/lib/search/constants'
import { PostData } from './filterPublishedPosts'
import { getAllPosts, getAllPostsWithDependencies } from './getAllPosts'

const MAX_LIMIT = 50

interface SearchPostsOptions {
  query: string
  tag?: string
  includePages?: boolean
  limit?: number
  signal?: AbortSignal
  dependencies?: SearchPostsDependencies
}

interface SearchPostsDependencies {
  apiClient?: Pick<NotionClient, 'queryAllDataSourcePages'>
  dataSourceId?: string
  sortByDate?: boolean
}

function normalizeForMatch(value: string): string {
  return value.trim().toLowerCase()
}

function tokenizeKeyword(value: string): string[] {
  return tokenizeSearchQuery(value, {
    maxTokens: MAX_SEARCH_KEYWORD_TOKENS,
    maxTokenLength: MAX_SEARCH_TOKEN_LENGTH
  })
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }
}

function matchesKeywordAndTag(post: PostData, keywordTokens: string[], normalizedTag: string): boolean {
  if (normalizedTag) {
    const postTags = (post.tags || []).map(item => normalizeForMatch(item))
    if (!postTags.includes(normalizedTag)) {
      return false
    }
  }

  if (!keywordTokens.length) {
    return true
  }

  const combined = normalizeForMatch(`${post.title || ''} ${post.summary || ''} ${(post.tags || []).join(' ')}`)
  return keywordTokens.every(token => combined.includes(token))
}

async function loadSearchablePosts(
  includePages: boolean,
  dependencies?: SearchPostsDependencies
): Promise<PostData[]> {
  if (!dependencies) {
    return getAllPosts({ includePages })
  }

  return getAllPostsWithDependencies({ includePages }, dependencies)
}

export async function searchPosts({
  query,
  tag = '',
  includePages = false,
  limit = 20,
  signal,
  dependencies
}: SearchPostsOptions): Promise<PostData[]> {
  const queryValue = query.trim()
  if (Array.from(queryValue).length < MIN_SEARCH_QUERY_LENGTH) return []

  const keywordTokensRaw = tokenizeKeyword(queryValue)
  const keywordTokens = keywordTokensRaw.map(token => normalizeForMatch(token))
  const tagValue = tag.trim()
  const normalizedTag = normalizeForMatch(tagValue)
  if (!keywordTokensRaw.length && !tagValue) return []

  const safeLimit = Math.max(1, Math.min(limit, MAX_LIMIT))

  throwIfAborted(signal)
  const posts = await loadSearchablePosts(includePages, dependencies)
  throwIfAborted(signal)

  const results = posts.filter(post => matchesKeywordAndTag(post, keywordTokens, normalizedTag))

  if (dependencies?.sortByDate ?? BLOG.sortByDate) {
    results.sort((a, b) => b.date - a.date)
  }

  return results.slice(0, safeLimit)
}
