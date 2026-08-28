'use client'

import { useDeferredValue, useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/theme.stylex'
import BlogPost from '@/components/BlogPost'
import Tags from '@/components/Tags'
import { appStyles } from '@/styles/app.stylex'
import type { PostData } from '@/lib/notion/filterPublishedPosts'
import { MIN_SEARCH_QUERY_LENGTH } from '@/lib/search/constants'

interface SearchClientProps {
  tags: Record<string, number>
  posts: PostData[]
  currentTag?: string
  useNotionSearch?: boolean
  loadTagsRemotely?: boolean
  blogPath: string
  lang: string
  timezone?: string
  tagsSlot?: ReactNode
  initialResultsCount?: number
  children?: ReactNode
}

function hasMinQueryLength(value: string): boolean {
  return Array.from(value).length >= MIN_SEARCH_QUERY_LENGTH
}

export default function SearchClient({
  tags,
  posts,
  currentTag,
  useNotionSearch = false,
  loadTagsRemotely = false,
  blogPath,
  lang,
  timezone,
  tagsSlot,
  initialResultsCount = 0,
  children
}: SearchClientProps) {
  const searchInputId = useId()
  const searchHintId = useId()
  const searchStatusId = useId()
  const [searchValue, setSearchValue] = useState('')
  const deferredSearchValue = useDeferredValue(searchValue)
  const [displayTags, setDisplayTags] = useState<Record<string, number>>(tags || {})
  const [remotePosts, setRemotePosts] = useState<PostData[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const shouldUseNotionSearch = useNotionSearch
  const searchablePosts = useMemo(
    () =>
      posts.map(post => {
        const tagContent = post.tags ? post.tags.join(' ') : ''
        return {
          post,
          searchContent: (post.title + post.summary + tagContent).toLowerCase()
        }
      }),
    [posts]
  )

  useEffect(() => {
    setDisplayTags(tags || {})
  }, [tags])

  useEffect(() => {
    if (!loadTagsRemotely) return undefined
    if (Object.keys(tags || {}).length > 0) return undefined

    const controller = new AbortController()
    fetch('/api/tags', {
      method: 'GET',
      signal: controller.signal
    })
      .then(async response => {
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load tags')
        }
        const nextTags = payload?.tags
        if (nextTags && typeof nextTags === 'object' && !Array.isArray(nextTags)) {
          setDisplayTags(nextTags)
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return
      })

    return () => controller.abort()
  }, [loadTagsRemotely, tags])

  useEffect(() => {
    if (!shouldUseNotionSearch) return undefined

    const keyword = searchValue.trim()
    if (!keyword || !hasMinQueryLength(keyword)) {
      setRemotePosts([])
      setIsSearching(false)
      setSearchError('')
      return undefined
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setIsSearching(true)
      setSearchError('')
      try {
        const searchParams = new URLSearchParams({
          q: keyword,
          limit: '20'
        })
        if (currentTag) {
          searchParams.set('tag', currentTag)
        }
        const response = await fetch(`/api/search?${searchParams.toString()}`, {
          method: 'GET',
          signal: controller.signal
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(payload?.error || 'Search request failed')
        }
        setRemotePosts(Array.isArray(payload?.posts) ? payload.posts : [])
      } catch (error: unknown) {
        if (controller.signal.aborted) return
        setRemotePosts([])
        setSearchError(error instanceof Error ? error.message : 'Search failed')
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false)
        }
      }
    }, 300)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [searchValue, shouldUseNotionSearch, currentTag])

  const trimmedQuery = deferredSearchValue.trim()
  const isQueryEmpty = !trimmedQuery
  const isQueryTooShort = !isQueryEmpty && !hasMinQueryLength(trimmedQuery)
  const shouldShowRemoteResults = shouldUseNotionSearch && !isQueryEmpty && !isQueryTooShort
  const hasInitialResults = initialResultsCount > 0
  const localFilteredPosts = useMemo(() => {
    if (!trimmedQuery) return posts
    const query = trimmedQuery.toLowerCase()
    return searchablePosts
      .filter(item => item.searchContent.includes(query))
      .map(item => item.post)
  }, [trimmedQuery, posts, searchablePosts])

  const filteredBlogPosts = shouldUseNotionSearch
    ? (shouldShowRemoteResults ? remotePosts : [])
    : localFilteredPosts

  const showInitialResults = shouldUseNotionSearch && !shouldShowRemoteResults && hasInitialResults
  const showNotionSearchHint = shouldUseNotionSearch && !showInitialResults && (isQueryEmpty || isQueryTooShort) && !isSearching && !searchError
  const showEmptyState = !showNotionSearchHint && !showInitialResults && !isSearching && !searchError && !filteredBlogPosts.length
  const notionSearchHint = isQueryTooShort
    ? `Type at least ${MIN_SEARCH_QUERY_LENGTH} characters to search posts in Notion.`
    : 'Type keywords to search posts in Notion.'
  const searchLabel = currentTag ? `Search posts in ${currentTag}` : 'Search articles'
  const statusMessage = isSearching
    ? 'Searching posts.'
    : searchError
      ? `Search failed: ${searchError}`
      : showNotionSearchHint
        ? notionSearchHint
        : showEmptyState
          ? 'No posts found.'
          : ''
  const describedBy = [
    showNotionSearchHint ? searchHintId : '',
    statusMessage ? searchStatusId : ''
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <div {...stylex.props(styles.searchField)}>
        <label htmlFor={searchInputId} {...stylex.props(appStyles.visuallyHidden)}>
          {searchLabel}
        </label>
        <input
          id={searchInputId}
          type="text"
          value={searchValue}
          aria-describedby={describedBy || undefined}
          placeholder={
            currentTag ? `Search in #${currentTag}` : 'Search Articles'
          }
          {...stylex.props(styles.input)}
          onChange={e => setSearchValue(e.target.value)}
        />
        <svg
          {...stylex.props(styles.searchIcon)}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
          focusable="false"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          ></path>
        </svg>
      </div>
      {tagsSlot || (
        <Tags
          tags={displayTags}
          currentTag={currentTag}
        />
      )}
      <div className={`article-container ${stylex.props(styles.results).className}`}>
        {statusMessage && (
          <p id={searchStatusId} {...stylex.props(appStyles.visuallyHidden)} aria-live="polite" aria-atomic="true">
            {statusMessage}
          </p>
        )}
        {showNotionSearchHint && (
          <p id={searchHintId} {...stylex.props(appStyles.mutedText)}>{notionSearchHint}</p>
        )}
        {isSearching && (
          <p {...stylex.props(appStyles.mutedText)} role="status">Searching...</p>
        )}
        {!isSearching && !!searchError && (
          <p {...stylex.props(styles.error)} role="alert">{searchError}</p>
        )}
        {showEmptyState && (
          <p {...stylex.props(appStyles.mutedText)} role="status">No posts found.</p>
        )}
        {showInitialResults && children}
        {filteredBlogPosts.slice(0, 20).map(post => (
          <BlogPost key={post.id} post={post} blogPath={blogPath} lang={lang} timezone={timezone} />
        ))}
      </div>
    </>
  )
}

const styles = stylex.create({
  searchField: {
    position: 'relative'
  },
  input: {
    backgroundColor: 'transparent',
    borderColor: {
      default: colors.borderInput,
      ':focus': colors.borderFocus
    },
    borderRadius: '0.375rem',
    borderStyle: 'solid',
    borderWidth: '1px',
    color: colors.textPrimary,
    display: 'block',
    padding: '0.5rem 1rem',
    transitionDuration: '150ms',
    transitionProperty: 'color, border-color, background-color',
    transitionTimingFunction: 'ease-out',
    width: '100%',
    '::placeholder': {
      color: colors.textQuiet
    }
  },
  searchIcon: {
    color: colors.textQuiet,
    height: '1.25rem',
    position: 'absolute',
    right: '0.75rem',
    top: '0.75rem',
    width: '1.25rem'
  },
  results: {
    marginBlock: '2rem'
  },
  error: {
    color: colors.textMutedStrong,
    fontWeight: 500
  }
})
