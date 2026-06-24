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
  authHeaders,
  buildSession,
  buildThreadBody,
  clearStoredSession,
  cx,
  DEFAULT_ENDPOINT,
  DEFAULT_LEGACY_AUTHORIZE_ENDPOINT,
  formatDate,
  normalizeEndpoint,
  parseJsonResponse,
  apiUrl,
  readStoredSession,
  renderMarkdown,
  writeStoredSession,
  COMMENT_PAGE_SIZE,
  OAUTH_SESSION_STORAGE_KEY,
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
  owner: string
  repo: string
  threadKey: string
  endpoint?: string
  documentTitle?: string
  documentDescription?: string
  documentUrl?: string
  requestGeoEndpoint?: string
  legacyAuthorizeEndpoint?: string
  locale?: string
  className?: string
  labels?: CommentBoxLabels
}

interface NativeThread {
  id: number
  number: number
  title: string
  slug?: string
  body: string
  comment_count: number
  author: NativeUser
  created_at: string
}

interface NativeComment {
  id: number
  body: string
  author: NativeUser
  created_at: string
}

interface CursorPage<T> {
  data: T[]
  pagination: {
    next_cursor: string | null
    has_more: boolean
  }
}

const subscribeNoop = () => () => {}

const defaultLabels: Required<Omit<CommentBoxLabels, 'commentsCount'>> = {
  title: '评论',
  caption: '读完之后，可以在这里继续这段讨论。',
  loading: '正在读取评论',
  empty: '还没有评论。',
  signIn: '使用 GitHub 登录',
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

async function requestNative<T>(
  endpoint: string,
  path: string,
  init?: RequestInit,
  session?: StoredSession | null
): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')
  if (init?.body) headers.set('Content-Type', 'application/json')
  if (session) headers.set('Authorization', `Bearer ${session.accessToken}`)

  const response = await fetch(apiUrl(endpoint, path), {
    ...init,
    headers
  })
  return parseJsonResponse<T>(response)
}

async function exchangeLegacySessionForGithubToken(endpoint: string, legacySession: string): Promise<string> {
  const response = await fetch(apiUrl(endpoint, '/api/utterances/token'), {
    method: 'POST',
    mode: 'cors',
    body: JSON.stringify(legacySession)
  })
  return parseJsonResponse<string>(response)
}

async function authenticateGithub(endpoint: string, githubToken: string): Promise<StoredSession> {
  const response = await fetch(apiUrl(endpoint, '/api/v1/auth/github'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ token: githubToken })
  })
  return buildSession(await parseJsonResponse<AuthTokenResponse>(response))
}

async function refreshSession(endpoint: string, session: StoredSession): Promise<StoredSession> {
  const response = await fetch(apiUrl(endpoint, '/api/v1/auth/refresh'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...authHeaders(session)
    },
    body: JSON.stringify({ refresh_token: session.refreshToken })
  })
  return buildSession(await parseJsonResponse<AuthTokenResponse>(response))
}

async function findThread(endpoint: string, owner: string, repo: string, threadKey: string): Promise<NativeThread | null> {
  // Primary: O(1) slug lookup (new threads created with slug).
  const slugPath = `/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/threads?state=all&slug=${encodeURIComponent(threadKey)}`
  const slugResult = await requestNative<CursorPage<NativeThread>>(endpoint, slugPath)
  if (slugResult.data.length > 0) return slugResult.data[0]

  // Fallback: title lookup for legacy threads created before slug support.
  const titlePath = `/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/threads?state=all&title=${encodeURIComponent(threadKey)}`
  const titleResult = await requestNative<CursorPage<NativeThread>>(endpoint, titlePath)
  if (titleResult.data.length > 0) return titleResult.data[0]

  return null
}

async function listComments(
  endpoint: string,
  owner: string,
  repo: string,
  threadNumber: number,
  cursor?: string | null
): Promise<CursorPage<NativeComment>> {
  return requestNative<CursorPage<NativeComment>>(
    endpoint,
    `/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/threads/${threadNumber}/comments?order=asc&limit=${COMMENT_PAGE_SIZE}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
  )
}

async function createThread(
  endpoint: string,
  owner: string,
  repo: string,
  threadKey: string,
  documentTitle: string,
  documentDescription: string,
  documentUrl: string,
  session: StoredSession
): Promise<NativeThread> {
  return requestNative<NativeThread>(
    endpoint,
    `/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/threads`,
    {
      method: 'POST',
      body: JSON.stringify({
        title: documentTitle || threadKey,
        slug: threadKey,
        body: buildThreadBody(documentTitle, documentDescription, documentUrl)
      })
    },
    session
  )
}

async function createComment(
  endpoint: string,
  owner: string,
  repo: string,
  threadNumber: number,
  body: string,
  session: StoredSession
): Promise<NativeComment> {
  return requestNative<NativeComment>(
    endpoint,
    `/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/threads/${threadNumber}/comments`,
    {
      method: 'POST',
      body: JSON.stringify({ body })
    },
    session
  )
}

export function CommentBox({
  owner,
  repo,
  threadKey,
  endpoint = DEFAULT_ENDPOINT,
  documentTitle = '',
  documentDescription = '',
  documentUrl = '',
  requestGeoEndpoint = '/api/request-geo',
  legacyAuthorizeEndpoint = DEFAULT_LEGACY_AUTHORIZE_ENDPOINT,
  locale = 'zh-CN',
  className,
  labels
}: CommentBoxProps) {
  const isHydrated = useIsHydrated()
  const sectionRef = useRef<HTMLElement | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [suppressed, setSuppressed] = useState(false)
  const [status, setStatus] = useState<CommentLoadStatus>('idle')
  const [thread, setThread] = useState<NativeThread | null>(null)
  const [comments, setComments] = useState<NativeComment[]>([])
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

  const currentDocumentUrl = useMemo(() => {
    if (documentUrl) return documentUrl
    if (!isHydrated || typeof window === 'undefined') return ''
    const url = new URL(window.location.href)
    url.searchParams.delete('utterances')
    return url.href
  }, [documentUrl, isHydrated])

  const signInUrl = useMemo(() => {
    if (!isHydrated || typeof window === 'undefined') return '#'
    const url = new URL(window.location.href)
    url.searchParams.delete('utterances')
    return `${legacyAuthorizeEndpoint}?${new URLSearchParams({ redirect_uri: url.href })}`
  }, [isHydrated, legacyAuthorizeEndpoint])

  const ensureFreshSession = useCallback(async (current: StoredSession | null): Promise<StoredSession | null> => {
    if (!current) return null
    if (current.expiresAt > Date.now()) return current
    const refreshed = await refreshSession(normalizedEndpoint, current)
    writeStoredSession(owner, repo, refreshed)
    setSession(refreshed)
    return refreshed
  }, [normalizedEndpoint, owner, repo])

  const loadInitial = useCallback(async () => {
    setStatus('loading')
    setError('')
    const matched = await findThread(normalizedEndpoint, owner, repo, threadKey)
    setThread(matched)
    if (!matched) {
      setComments([])
      setNextCursor(null)
      setHasMore(false)
      setStatus('ready')
      return
    }

    const page = await listComments(normalizedEndpoint, owner, repo, matched.number)
    setComments(page.data)
    setNextCursor(page.pagination.next_cursor)
    setHasMore(page.pagination.has_more)
    setStatus('ready')
  }, [normalizedEndpoint, owner, repo, threadKey])

  useEffect(() => {
    if (!isHydrated) return undefined
    const stored = readStoredSession(owner, repo)
    if (stored) setSession(stored)

    const currentUrl = new URL(window.location.href)
    const legacySession = currentUrl.searchParams.get('utterances')
    if (!legacySession) return undefined

    localStorage.setItem(OAUTH_SESSION_STORAGE_KEY, legacySession)
    currentUrl.searchParams.delete('utterances')
    history.replaceState(undefined, document.title, currentUrl.href)

    let cancelled = false
    ;(async () => {
      try {
        const githubToken = await exchangeLegacySessionForGithubToken(normalizedEndpoint, legacySession)
        const next = await authenticateGithub(normalizedEndpoint, githubToken)
        if (cancelled) return
        writeStoredSession(owner, repo, next)
        setSession(next)
      } catch {
        if (!cancelled) setError(copy.authError)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [copy.authError, isHydrated, normalizedEndpoint, owner, repo])

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

  // Render comment bodies (GFM → sanitized HTML) whenever the list changes.
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
    if (!thread || !hasMore || busy) return
    setBusy(true)
    setError('')
    try {
      const page = await listComments(normalizedEndpoint, owner, repo, thread.number, nextCursor)
      setComments(current => [...current, ...page.data])
      setNextCursor(page.pagination.next_cursor)
      setHasMore(page.pagination.has_more)
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
      const targetThread = thread || await createThread(
        normalizedEndpoint,
        owner,
        repo,
        threadKey,
        documentTitle || threadKey,
        documentDescription,
        currentDocumentUrl,
        freshSession
      )
      if (!thread) setThread(targetThread)

      const comment = await createComment(normalizedEndpoint, owner, repo, targetThread.number, body, freshSession)
      setComments(current => [...current, comment])
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

  const handleSignOut = () => {
    clearStoredSession(owner, repo)
    setSession(null)
  }

  if (suppressed) return null

  const isLoading = status === 'idle' || status === 'loading'
  const canSubmit = !!session && draft.trim().length > 0 && !busy
  const totalCount = thread?.comment_count ?? comments.length

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
                        <a
                          href={`https://github.com/${encodeURIComponent(comment.author.login)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition-colors duration-150 hover:text-stone-600 dark:hover:text-stone-300"
                        >
                          {comment.author.login}
                        </a>
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
