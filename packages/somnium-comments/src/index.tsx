'use client'

import type { FormEvent, KeyboardEvent } from 'react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'
import {
  apiUrl,
  buildSession,
  clearStoredSession,
  COMMENT_PAGE_SIZE,
  cx,
  DEFAULT_ENDPOINT,
  formatDate,
  normalizeEndpoint,
  parseJsonResponse,
  readStoredSession,
  renderMarkdown,
  writeStoredSession,
  type AuthTokenResponse,
  type NativeUser,
  type StoredSession
} from './utils'

export type CommentLoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface CommentBoxLabels {
  title?: string
  caption?: string
  loading?: string
  empty?: string
  signIn?: string
  signOut?: string
  signedInAs?: string
  textareaPlaceholder?: string
  textareaDisabledPlaceholder?: string
  submit?: string
  submitting?: string
  loadMore?: string
  retry?: string
  errorTitle?: string
  authError?: string
  commentsCount?: (count: number) => string
}

export interface CommentBoxProps {
  endpoint?: string
  websiteKey?: string
  pageKey?: string
  pageTitle?: string
  pageUrl?: string
  documentTitle?: string
  documentUrl?: string
  requestGeoEndpoint?: string
  locale?: string
  className?: string
  labels?: CommentBoxLabels
}

interface ReactionCounts {
  like: number
  dislike: number
  heart: number
  laugh: number
  hooray: number
  confused: number
  rocket: number
  eyes: number
  total: number
}

interface AtriumWebsite {
  id: number
  key: string
  name: string
  origins?: string[]
  created_at: string
  updated_at: string
}

interface AtriumPage {
  id: number
  website_key: string
  key: string
  title: string
  url: string
  normalized_url: string
  metadata: unknown
  comment_count: number
  created_at: string
  updated_at: string
}

interface AtriumComment {
  id: number
  website_key: string
  page_key: string
  parent_id: number | null
  body: string
  body_html?: string
  author: NativeUser
  reactions: ReactionCounts
  deleted?: boolean
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

interface CursorPage<T> {
  data: T[]
  pagination: {
    next_cursor: string | null
    has_more: boolean
  }
}

interface CurrentCommentsResponse {
  website: AtriumWebsite
  page: AtriumPage
  comments: CursorPage<AtriumComment>
}

interface AuthMeResponse {
  user: NativeUser
  super_admin?: boolean
}

interface CommentTarget {
  websiteKey?: string
  pageKey?: string
}

const subscribeNoop = () => () => {}

const defaultLabels: Required<Omit<CommentBoxLabels, 'commentsCount'>> = {
  title: '评论',
  caption: '读完之后，可以在这里继续这段讨论。',
  loading: '正在读取评论',
  empty: '还没有评论。',
  signIn: '登录',
  signOut: '退出',
  signedInAs: '已登录为',
  textareaPlaceholder: '写下你的想法',
  textareaDisabledPlaceholder: '登录后参与讨论',
  submit: '发布评论',
  submitting: '发布中...',
  loadMore: '加载更多',
  retry: '重试',
  errorTitle: '评论暂时不可用',
  authError: '登录状态不可用，请重新登录。'
}

const defaultCommentsCount = (count: number): string => `${count} 条评论`

function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  )
}

function requestHeaders(init?: RequestInit, session?: StoredSession | null): Headers {
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')
  if (init?.body) headers.set('Content-Type', 'application/json')
  if (session?.accessToken) headers.set('Authorization', `Bearer ${session.accessToken}`)
  return headers
}

async function requestNative<T>(
  endpoint: string,
  path: string,
  init?: RequestInit,
  session?: StoredSession | null,
  authenticated = false
): Promise<T> {
  const response = await fetch(apiUrl(endpoint, path), {
    ...init,
    headers: requestHeaders(init, session),
    credentials: authenticated && !session?.accessToken ? 'include' : 'same-origin'
  })
  return parseJsonResponse<T>(response)
}

async function authenticateAccount(endpoint: string): Promise<StoredSession> {
  const response = await fetch(apiUrl(endpoint, '/api/v1/auth/account'), {
    method: 'POST',
    headers: {
      Accept: 'application/json'
    },
    credentials: 'include'
  })
  return buildSession(await parseJsonResponse<AuthTokenResponse>(response))
}

async function fetchMeFromCookies(endpoint: string): Promise<NativeUser | null> {
  const response = await fetch(apiUrl(endpoint, '/api/v1/auth/me'), {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' }
  })
  if (!response.ok) return null
  const payload = await response.json().catch(() => null) as AuthMeResponse | null
  return payload?.user ?? null
}

async function refreshSession(endpoint: string, session: StoredSession): Promise<StoredSession> {
  const response = await fetch(apiUrl(endpoint, '/api/v1/auth/refresh'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refresh_token: session.refreshToken })
  })
  return buildSession(await parseJsonResponse<AuthTokenResponse>(response))
}

function explicitPageCommentsPath(target: CommentTarget): string | null {
  if (!target.websiteKey || !target.pageKey) return null
  return `/api/v1/websites/${encodeURIComponent(target.websiteKey)}/pages/${encodeURIComponent(target.pageKey)}/comments`
}

function pathWithQuery(path: string, query?: Record<string, string | number | null | undefined>): string {
  const params = new URLSearchParams()
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })
  const queryString = params.toString()
  return queryString ? `${path}?${queryString}` : path
}

async function listExplicitComments(
  endpoint: string,
  path: string,
  cursor?: string | null
): Promise<CursorPage<AtriumComment>> {
  return requestNative<CursorPage<AtriumComment>>(
    endpoint,
    pathWithQuery(path, {
      parent_id: 'root',
      limit: COMMENT_PAGE_SIZE,
      order: 'asc',
      cursor
    })
  )
}

async function listCurrentComments(
  endpoint: string,
  pageTitle: string,
  cursor?: string | null
): Promise<CurrentCommentsResponse> {
  return requestNative<CurrentCommentsResponse>(
    endpoint,
    pathWithQuery('/api/v1/comments/current', {
      page_title: pageTitle,
      limit: COMMENT_PAGE_SIZE,
      order: 'asc',
      cursor
    })
  )
}

async function createComment(
  endpoint: string,
  target: CommentTarget,
  pageTitle: string,
  body: string,
  session: StoredSession
): Promise<AtriumComment> {
  const explicitPath = explicitPageCommentsPath(target)
  if (explicitPath) {
    return requestNative<AtriumComment>(
      endpoint,
      explicitPath,
      {
        method: 'POST',
        body: JSON.stringify({ body })
      },
      session,
      true
    )
  }

  return requestNative<AtriumComment>(
    endpoint,
    '/api/v1/comments/current',
    {
      method: 'POST',
      body: JSON.stringify({ body, page_title: pageTitle })
    },
    session,
    true
  )
}

export function CommentBox({
  endpoint = DEFAULT_ENDPOINT,
  websiteKey,
  pageKey,
  pageTitle,
  pageUrl,
  documentTitle = '',
  documentUrl = '',
  requestGeoEndpoint = '/api/request-geo',
  locale = 'zh-CN',
  className,
  labels
}: CommentBoxProps) {
  const isHydrated = useIsHydrated()
  const sectionRef = useRef<HTMLElement | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [suppressed, setSuppressed] = useState(false)
  const [status, setStatus] = useState<CommentLoadStatus>('idle')
  const [page, setPage] = useState<AtriumPage | null>(null)
  const [comments, setComments] = useState<AtriumComment[]>([])
  const [renderedHtml, setRenderedHtml] = useState<Record<number, string>>({})
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [session, setSession] = useState<StoredSession | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const copy = { ...defaultLabels, ...labels }
  const commentsCountLabel = labels?.commentsCount ?? defaultCommentsCount
  const normalizedEndpoint = useMemo(() => normalizeEndpoint(endpoint), [endpoint])
  const target = useMemo<CommentTarget>(() => ({ websiteKey, pageKey }), [pageKey, websiteKey])
  const pageTitleValue = pageTitle || documentTitle || (pageKey ? String(pageKey) : 'Untitled')
  const storageScope = normalizedEndpoint

  const currentDocumentUrl = useMemo(() => {
    if (pageUrl) return pageUrl
    if (documentUrl) return documentUrl
    if (!isHydrated || typeof window === 'undefined') return ''
    return window.location.href
  }, [documentUrl, isHydrated, pageUrl])

  const signInUrl = useMemo(() => {
    if (!isHydrated || typeof window === 'undefined') return '#'
    const url = new URL(window.location.href)
    return apiUrl(normalizedEndpoint, '/api/v1/auth/account/authorize', {
      redirect_uri: url.href,
      state: pageKey || currentDocumentUrl || url.href
    })
  }, [currentDocumentUrl, isHydrated, normalizedEndpoint, pageKey])

  const ensureFreshSession = useCallback(async (current: StoredSession | null): Promise<StoredSession | null> => {
    if (!current) return null
    if (current.accessToken && current.expiresAt > Date.now()) return current
    if (current.refreshToken) {
      const refreshed = await refreshSession(normalizedEndpoint, current)
      writeStoredSession(storageScope, refreshed)
      setSession(refreshed)
      return refreshed
    }
    return current
  }, [normalizedEndpoint, storageScope])

  const loadInitial = useCallback(async () => {
    setStatus('loading')
    setError('')

    const explicitPath = explicitPageCommentsPath(target)
    const loaded = explicitPath
      ? {
          page: null,
          comments: await listExplicitComments(normalizedEndpoint, explicitPath)
        }
      : await listCurrentComments(normalizedEndpoint, pageTitleValue).then(payload => ({
          page: payload.page,
          comments: payload.comments
        }))

    setPage(loaded.page)
    setComments(loaded.comments.data)
    setNextCursor(loaded.comments.pagination.next_cursor)
    setHasMore(loaded.comments.pagination.has_more)
    setStatus('ready')
  }, [normalizedEndpoint, pageTitleValue, target])

  useEffect(() => {
    if (!isHydrated) return undefined
    const stored = readStoredSession(storageScope)
    if (stored) {
      setSession(stored)
      return undefined
    }

    let cancelled = false
    ;(async () => {
      try {
        const next = await authenticateAccount(normalizedEndpoint)
        if (cancelled) return
        writeStoredSession(storageScope, next)
        setSession(next)
      } catch {
        try {
          const user = await fetchMeFromCookies(normalizedEndpoint)
          if (cancelled || !user) return
          setSession({
            accessToken: '',
            refreshToken: '',
            expiresAt: Number.MAX_SAFE_INTEGER,
            user
          })
        } catch {
          // Anonymous reads are valid; auth is only required for writes.
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isHydrated, normalizedEndpoint, storageScope])

  useEffect(() => {
    if (enabled || suppressed || !sectionRef.current) return undefined

    let idleTimer: ReturnType<typeof setTimeout> | null = null
    let idleId: number | null = null
    let controller: AbortController | null = null
    let cancelled = false

    const activate = async () => {
      controller = new AbortController()
      try {
        const response = await fetch(requestGeoEndpoint, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store'
        })
        const payload = await response.json().catch(() => null)
        if (cancelled || controller.signal.aborted) return
        if (response.ok && payload?.hideComments === true) {
          setSuppressed(true)
          return
        }
      } catch {
        if (cancelled || controller?.signal.aborted) return
      }
      if (!cancelled) setEnabled(true)
    }

    const scheduleActivate = () => {
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        idleId = window.requestIdleCallback(activate, { timeout: 1200 })
      } else {
        idleTimer = globalThis.setTimeout(activate, 160)
      }
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some(entry => entry.isIntersecting)) return
      observer.disconnect()
      scheduleActivate()
    }, {
      root: null,
      rootMargin: '240px 0px',
      threshold: 0.01
    })
    observer.observe(sectionRef.current)

    return () => {
      cancelled = true
      controller?.abort()
      observer.disconnect()
      if (idleId !== null && typeof window !== 'undefined' && window.cancelIdleCallback) {
        window.cancelIdleCallback(idleId)
      }
      if (idleTimer !== null) globalThis.clearTimeout(idleTimer)
    }
  }, [enabled, requestGeoEndpoint, suppressed])

  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    ;(async () => {
      try {
        await loadInitial()
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setError(err instanceof Error ? err.message : copy.errorTitle)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [copy.errorTitle, enabled, loadInitial])

  useEffect(() => {
    if (comments.length === 0) {
      setRenderedHtml({})
      return undefined
    }
    let cancelled = false
    ;(async () => {
      const next: Record<number, string> = {}
      await Promise.all(comments.map(async comment => {
        next[comment.id] = await renderMarkdown(comment.body)
      }))
      if (!cancelled) setRenderedHtml(next)
    })()
    return () => {
      cancelled = true
    }
  }, [comments])

  const handleLoadMore = async () => {
    if (!hasMore || busy) return
    setBusy(true)
    setError('')
    try {
      const explicitPath = explicitPageCommentsPath(target)
      const loaded = explicitPath
        ? await listExplicitComments(normalizedEndpoint, explicitPath, nextCursor)
        : (await listCurrentComments(normalizedEndpoint, pageTitleValue, nextCursor)).comments
      setComments(current => [...current, ...loaded.data])
      setNextCursor(loaded.pagination.next_cursor)
      setHasMore(loaded.pagination.has_more)
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errorTitle)
    } finally {
      setBusy(false)
    }
  }

  const submitDraft = async () => {
    const body = draft.trim()
    if (!body || busy) return

    setBusy(true)
    setError('')
    try {
      const freshSession = await ensureFreshSession(session)
      if (!freshSession) {
        setError(copy.authError)
        return
      }

      const comment = await createComment(normalizedEndpoint, target, pageTitleValue, body, freshSession)
      setComments(current => [...current, comment])
      setPage(current => current ? { ...current, comment_count: current.comment_count + 1 } : current)
      setDraft('')
      setStatus('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errorTitle)
    } finally {
      setBusy(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void submitDraft()
  }

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      void submitDraft()
    }
  }

  const handleSignOut = async () => {
    clearStoredSession(storageScope)
    try {
      await fetch(apiUrl(normalizedEndpoint, '/api/v1/auth/session'), {
        method: 'DELETE',
        credentials: 'include'
      })
    } catch {
      // Best effort; local state is cleared either way.
    }
    setSession(null)
  }

  if (suppressed) return null

  const isLoading = status === 'idle' || status === 'loading'
  const canSubmit = !!session && draft.trim().length > 0 && !busy
  const totalCount = page?.comment_count ?? comments.length

  return (
    <section
      ref={sectionRef}
      id="comments"
      aria-labelledby="comments-title"
      className={cx(
        'my-10 border-t border-stone-200/80 pt-6 text-stone-700 dark:border-stone-800/90 dark:text-stone-300',
        className
      )}
    >
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id="comments-title" className="font-serif text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            <span>{copy.title}</span>
            {status === 'ready' && (
              <span className="ml-2 align-middle text-sm font-normal text-stone-400 dark:text-stone-500">
                {commentsCountLabel(totalCount)}
              </span>
            )}
          </h2>
          <p className="mt-1 text-sm leading-6 text-stone-500 dark:text-stone-500">
            {copy.caption}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-sm">
          {session ? (
            <>
              <span className="max-w-[12rem] truncate text-stone-500 dark:text-stone-500">
                {copy.signedInAs} {session.user.login}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-md border border-stone-300 px-2.5 py-1 text-stone-600 transition-colors duration-150 hover:border-stone-400 hover:text-stone-950 dark:border-stone-700 dark:text-stone-400 dark:hover:border-stone-500 dark:hover:text-stone-100"
              >
                {copy.signOut}
              </button>
            </>
          ) : (
            <a
              href={signInUrl}
              className="rounded-md border border-stone-300 px-3 py-1.5 font-medium text-stone-700 transition-colors duration-150 hover:border-stone-400 hover:text-stone-950 dark:border-stone-700 dark:text-stone-300 dark:hover:border-stone-500 dark:hover:text-stone-100"
            >
              {copy.signIn}
            </a>
          )}
        </div>
      </header>

      <div
        className="rounded-md border border-stone-200/75 bg-stone-50/45 dark:border-stone-800/80 dark:bg-stone-950/20"
        role="status"
        aria-live="polite"
      >
        {isLoading && (
          <div className="px-5 py-6">
            <div className="h-3 w-24 rounded-full bg-stone-200/80 dark:bg-stone-800/90" />
            <div className="mt-5 space-y-3">
              <div className="h-3 w-full max-w-[32rem] rounded-full bg-stone-200/65 dark:bg-stone-800/70" />
              <div className="h-3 w-2/3 rounded-full bg-stone-200/55 dark:bg-stone-800/60" />
            </div>
            <p className="mt-5 text-sm font-medium text-stone-500 dark:text-stone-500">
              {copy.loading}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="px-5 py-6">
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              {copy.errorTitle}
            </p>
            {error && (
              <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-500">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={loadInitial}
              className="mt-4 rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors duration-150 hover:border-stone-400 hover:text-stone-950 dark:border-stone-700 dark:text-stone-300 dark:hover:border-stone-500 dark:hover:text-stone-100"
            >
              {copy.retry}
            </button>
          </div>
        )}

        {status === 'ready' && (
          <>
            <div className="divide-y divide-stone-200/70 dark:divide-stone-800/80">
              {comments.length === 0 ? (
                <p className="px-5 py-6 text-sm text-stone-500 dark:text-stone-500">
                  {copy.empty}
                </p>
              ) : comments.map(comment => (
                <article key={comment.id} className="px-5 py-5">
                  <header className="flex items-center gap-3">
                    {comment.author.avatar_url ? (
                      <img
                        src={comment.author.avatar_url}
                        alt=""
                        className="h-8 w-8 rounded-full border border-stone-200 bg-stone-100 dark:border-stone-800 dark:bg-stone-900"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full border border-stone-200 bg-stone-100 dark:border-stone-800 dark:bg-stone-900" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {comment.author.login}
                      </p>
                      <time className="block text-xs text-stone-400 dark:text-stone-600">
                        {formatDate(comment.created_at, locale)}
                      </time>
                    </div>
                  </header>
                  <div
                    className="comment-body mt-4 break-words text-[0.95rem] leading-7 text-stone-700 dark:text-stone-300"
                    dangerouslySetInnerHTML={{ __html: renderedHtml[comment.id] ?? '' }}
                  />
                </article>
              ))}
            </div>

            {hasMore && (
              <div className="border-t border-stone-200/70 px-5 py-4 dark:border-stone-800/80">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleLoadMore}
                  className="text-sm font-medium text-stone-600 transition-colors duration-150 hover:text-stone-950 disabled:cursor-not-allowed disabled:text-stone-400 dark:text-stone-400 dark:hover:text-stone-100 dark:disabled:text-stone-700"
                >
                  {copy.loadMore}
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="border-t border-stone-200/70 p-5 dark:border-stone-800/80">
              <label htmlFor="comment-draft" className="sr-only">
                {copy.textareaPlaceholder}
              </label>
              <textarea
                id="comment-draft"
                value={draft}
                disabled={!session || busy}
                onChange={event => setDraft(event.currentTarget.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder={session ? copy.textareaPlaceholder : copy.textareaDisabledPlaceholder}
                className="block min-h-28 w-full resize-y rounded-md border border-stone-200 bg-white px-3 py-2 text-sm leading-6 text-stone-800 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-400 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 dark:border-stone-800 dark:bg-stone-950/40 dark:text-stone-200 dark:placeholder:text-stone-600 dark:focus:border-stone-600 dark:disabled:bg-stone-900/60 dark:disabled:text-stone-700"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                {error ? (
                  <p className="text-sm text-stone-500 dark:text-stone-500">
                    {error}
                  </p>
                ) : <span />}
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors duration-150 hover:border-stone-400 hover:text-stone-950 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400 dark:border-stone-700 dark:text-stone-300 dark:hover:border-stone-500 dark:hover:text-stone-100 dark:disabled:border-stone-800 dark:disabled:text-stone-700"
                >
                  {busy ? copy.submitting : copy.submit}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  )
}

export default CommentBox
