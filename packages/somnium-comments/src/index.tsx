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
  reply?: string
  cancelReply?: string
  replyPlaceholder?: string
  submitReply?: string
  loadMoreReplies?: string
  loadingReplies?: string
  deleteComment?: string
  banUser?: string
  bannedUser?: string
  confirmDelete?: (author: string) => string
  confirmBan?: (author: string) => string
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

type ReactionContent = 'like' | 'dislike' | 'heart' | 'laugh' | 'hooray' | 'confused' | 'rocket' | 'eyes'

interface ReactionOption {
  content: ReactionContent
  label: string
  icon: string
}

interface ReplyBucket {
  comments: AtriumComment[]
  nextCursor: string | null
  hasMore: boolean
  status: 'idle' | 'loading' | 'ready' | 'error'
  error?: string
}

const COMMENT_SECTION_ID = 'comments'
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
  authError: '登录状态不可用，请重新登录。',
  reply: '回复',
  cancelReply: '取消',
  replyPlaceholder: '写下你的回复',
  submitReply: '发布回复',
  loadMoreReplies: '加载更多回复',
  loadingReplies: '正在读取回复',
  deleteComment: '删除',
  banUser: '禁言',
  bannedUser: '已禁言',
  confirmDelete: (author: string) => `确定删除 @${author} 的这条评论吗？`,
  confirmBan: (author: string) => `确定禁止 @${author} 继续在本站评论吗？`
}

const defaultCommentsCount = (count: number): string => `${count} 条评论`
const reactionOptions: ReactionOption[] = [
  { content: 'like', label: '赞', icon: '👍' },
  { content: 'dislike', label: '踩', icon: '👎' },
  { content: 'heart', label: '喜欢', icon: '❤️' },
  { content: 'laugh', label: '会心', icon: '😄' },
  { content: 'hooray', label: '庆祝', icon: '🎉' },
  { content: 'confused', label: '困惑', icon: '😕' },
  { content: 'rocket', label: '推荐', icon: '🚀' },
  { content: 'eyes', label: '围观', icon: '👀' }
]

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

function normalizeRequestReferrer(value?: string): string | undefined {
  const trimmed = `${value || ''}`.trim()
  if (!trimmed) return undefined
  try {
    return new URL(trimmed).toString()
  } catch {
    return undefined
  }
}

async function requestNative<T>(
  endpoint: string,
  path: string,
  init?: RequestInit,
  session?: StoredSession | null,
  authenticated = false,
  referrerUrl?: string
): Promise<T> {
  const requestInit: RequestInit = {
    ...init,
    headers: requestHeaders(init, session),
    credentials: authenticated && !session?.accessToken ? 'include' : 'same-origin'
  }
  const referrer = normalizeRequestReferrer(referrerUrl)
  if (referrer) {
    requestInit.referrer = referrer
    requestInit.referrerPolicy = 'unsafe-url'
  }

  const response = await fetch(apiUrl(endpoint, path), requestInit)
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
  referrerUrl?: string,
  cursor?: string | null
): Promise<CurrentCommentsResponse> {
  return requestNative<CurrentCommentsResponse>(
    endpoint,
    pathWithQuery('/api/v1/comments/current', {
      page_title: pageTitle,
      limit: COMMENT_PAGE_SIZE,
      order: 'asc',
      cursor
    }),
    undefined,
    undefined,
    false,
    referrerUrl
  )
}

async function listReplies(
  endpoint: string,
  target: CommentTarget,
  pageTitle: string,
  commentId: number,
  referrerUrl?: string,
  cursor?: string | null
): Promise<CursorPage<AtriumComment>> {
  const explicitPath = explicitPageCommentsPath(target)
  if (explicitPath) {
    return requestNative<CursorPage<AtriumComment>>(
      endpoint,
      pathWithQuery(explicitPath, {
        parent_id: commentId,
        limit: COMMENT_PAGE_SIZE,
        order: 'asc',
        cursor
      })
    )
  }

  return requestNative<CursorPage<AtriumComment>>(
    endpoint,
    pathWithQuery('/api/v1/comments/current/replies', {
      comment_id: commentId,
      page_title: pageTitle,
      limit: COMMENT_PAGE_SIZE,
      order: 'asc',
      cursor
    }),
    undefined,
    undefined,
    false,
    referrerUrl
  )
}

interface CreateCommentOptions {
  parentId?: number | null
  referrerUrl?: string
}

async function createComment(
  endpoint: string,
  target: CommentTarget,
  pageTitle: string,
  body: string,
  session: StoredSession,
  options: CreateCommentOptions = {}
): Promise<AtriumComment> {
  const { parentId, referrerUrl } = options
  const payload = parentId == null ? { body } : { body, parent_id: parentId }
  const explicitPath = explicitPageCommentsPath(target)
  if (explicitPath) {
    return requestNative<AtriumComment>(
      endpoint,
      explicitPath,
      {
        method: 'POST',
        body: JSON.stringify(payload)
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
      body: JSON.stringify({ ...payload, page_title: pageTitle })
    },
    session,
    true,
    referrerUrl
  )
}

async function setReaction(
  endpoint: string,
  target: CommentTarget,
  commentId: number,
  content: ReactionContent,
  session: StoredSession,
  referrerUrl?: string
): Promise<ReactionCounts> {
  const path = target.websiteKey
    ? `/api/v1/websites/${encodeURIComponent(target.websiteKey)}/comments/${commentId}/reactions/${content}`
    : `/api/v1/comments/current/${commentId}/reactions/${content}`
  return requestNative<ReactionCounts>(
    endpoint,
    path,
    { method: 'PUT' },
    session,
    true,
    target.websiteKey ? undefined : referrerUrl
  )
}

async function deleteReaction(
  endpoint: string,
  target: CommentTarget,
  commentId: number,
  content: ReactionContent,
  session: StoredSession,
  referrerUrl?: string
): Promise<void> {
  const path = target.websiteKey
    ? `/api/v1/websites/${encodeURIComponent(target.websiteKey)}/comments/${commentId}/reactions/${content}`
    : `/api/v1/comments/current/${commentId}/reactions/${content}`
  await requestNative<void>(
    endpoint,
    path,
    { method: 'DELETE' },
    session,
    true,
    target.websiteKey ? undefined : referrerUrl
  )
}

async function canModerateWebsite(endpoint: string, websiteKey: string, session: StoredSession): Promise<boolean> {
  try {
    await requestNative<{ data: unknown[] }>(
      endpoint,
      `/api/v1/websites/${encodeURIComponent(websiteKey)}/admins`,
      undefined,
      session,
      true
    )
    return true
  } catch {
    return false
  }
}

async function deleteComment(
  endpoint: string,
  websiteKey: string,
  commentId: number,
  session: StoredSession
): Promise<void> {
  await requestNative<void>(
    endpoint,
    `/api/v1/websites/${encodeURIComponent(websiteKey)}/comments/${commentId}`,
    { method: 'DELETE' },
    session,
    true
  )
}

async function banWebsiteUser(
  endpoint: string,
  websiteKey: string,
  userId: number,
  session: StoredSession
): Promise<void> {
  await requestNative<void>(
    endpoint,
    `/api/v1/websites/${encodeURIComponent(websiteKey)}/bans`,
    {
      method: 'POST',
      body: JSON.stringify({ user_id: userId })
    },
    session,
    true
  )
}

function reactionKey(commentId: number, content: ReactionContent): string {
  return `${commentId}:${content}`
}

function adjustReactionCounts(reactions: ReactionCounts, content: ReactionContent, delta: number): ReactionCounts {
  const nextValue = Math.max(0, reactions[content] + delta)
  const nextTotal = Math.max(0, reactions.total + delta)
  return { ...reactions, [content]: nextValue, total: nextTotal }
}

function withCommentSectionHash(value: string): string {
  try {
    const url = new URL(value)
    url.hash = COMMENT_SECTION_ID
    return url.toString()
  } catch {
    return value
  }
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
  const [website, setWebsite] = useState<AtriumWebsite | null>(null)
  const [comments, setComments] = useState<AtriumComment[]>([])
  const [replyBuckets, setReplyBuckets] = useState<Record<number, ReplyBucket>>({})
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [reactionBusy, setReactionBusy] = useState<Record<string, boolean>>({})
  const [activeReactions, setActiveReactions] = useState<Record<string, boolean>>({})
  const [reactionPickerFor, setReactionPickerFor] = useState<number | null>(null)
  const [commentActionBusy, setCommentActionBusy] = useState<Record<string, boolean>>({})
  const [canModerate, setCanModerate] = useState(false)
  const [bannedAuthors, setBannedAuthors] = useState<Record<number, boolean>>({})
  const [renderedHtml, setRenderedHtml] = useState<Record<number, string>>({})
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [session, setSession] = useState<StoredSession | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const composerRef = useRef<HTMLTextAreaElement | null>(null)

  const copy = { ...defaultLabels, ...labels }
  const commentsCountLabel = labels?.commentsCount ?? defaultCommentsCount
  const normalizedEndpoint = useMemo(() => normalizeEndpoint(endpoint), [endpoint])
  const target = useMemo<CommentTarget>(() => ({ websiteKey, pageKey }), [pageKey, websiteKey])
  const pageTitleValue = pageTitle || documentTitle || (pageKey ? String(pageKey) : 'Untitled')
  const storageScope = normalizedEndpoint
  const resolvedWebsiteKey = target.websiteKey || page?.website_key || website?.key || ''
  const visibleComments = useMemo(() => {
    const replies = Object.values(replyBuckets).flatMap(bucket => bucket.comments)
    return [...comments, ...replies]
  }, [comments, replyBuckets])

  const currentDocumentUrl = useMemo(() => {
    if (isHydrated && typeof window !== 'undefined') {
      if (pageUrl) {
        try {
          const configured = new URL(pageUrl)
          if (configured.origin === window.location.origin) return configured.toString()
        } catch {
          // Fall back to the browser location below.
        }
      }
      return window.location.href
    }
    if (pageUrl) return pageUrl
    if (documentUrl) return documentUrl
    return ''
  }, [documentUrl, isHydrated, pageUrl])

  const signInUrl = useMemo(() => {
    if (!isHydrated || typeof window === 'undefined') return '#'
    const url = new URL(window.location.href)
    const returnUrl = withCommentSectionHash(url.href)
    return apiUrl(normalizedEndpoint, '/api/v1/auth/account/authorize', {
      redirect_uri: returnUrl,
      state: pageKey || currentDocumentUrl || returnUrl
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

  const updateCommentEverywhere = useCallback((commentId: number, updater: (comment: AtriumComment) => AtriumComment) => {
    setComments(current => current.map(comment => comment.id === commentId ? updater(comment) : comment))
    setReplyBuckets(current => {
      let changed = false
      const next: Record<number, ReplyBucket> = {}
      Object.entries(current).forEach(([key, bucket]) => {
        let bucketChanged = false
        const comments = bucket.comments.map(comment => {
          if (comment.id !== commentId) return comment
          bucketChanged = true
          return updater(comment)
        })
        if (bucketChanged) changed = true
        next[Number(key)] = bucketChanged ? { ...bucket, comments } : bucket
      })
      return changed ? next : current
    })
  }, [])

  const removeCommentEverywhere = useCallback((commentId: number) => {
    setComments(current => current.filter(comment => comment.id !== commentId))
    setReplyBuckets(current => {
      let changed = false
      const next: Record<number, ReplyBucket> = {}
      Object.entries(current).forEach(([key, bucket]) => {
        const parentId = Number(key)
        if (parentId === commentId) {
          changed = true
          return
        }
        const comments = bucket.comments.filter(comment => comment.id !== commentId)
        if (comments.length !== bucket.comments.length) changed = true
        next[parentId] = comments.length === bucket.comments.length ? bucket : { ...bucket, comments }
      })
      return changed ? next : current
    })
  }, [])

  const loadRepliesForComment = useCallback(async (commentId: number, cursor?: string | null) => {
    setReplyBuckets(current => {
      const existing = current[commentId]
      return {
        ...current,
        [commentId]: {
          comments: existing?.comments ?? [],
          nextCursor: existing?.nextCursor ?? null,
          hasMore: existing?.hasMore ?? false,
          status: 'loading'
        }
      }
    })

    try {
      const page = await listReplies(normalizedEndpoint, target, pageTitleValue, commentId, currentDocumentUrl, cursor)
      setReplyBuckets(current => {
        const existing = current[commentId]
        const previous = cursor ? existing?.comments ?? [] : []
        return {
          ...current,
          [commentId]: {
            comments: [...previous, ...page.data],
            nextCursor: page.pagination.next_cursor,
            hasMore: page.pagination.has_more,
            status: 'ready'
          }
        }
      })
    } catch (err) {
      setReplyBuckets(current => {
        const existing = current[commentId]
        return {
          ...current,
          [commentId]: {
            comments: existing?.comments ?? [],
            nextCursor: existing?.nextCursor ?? null,
            hasMore: existing?.hasMore ?? false,
            status: 'error',
            error: err instanceof Error ? err.message : copy.errorTitle
          }
        }
      })
    }
  }, [copy.errorTitle, currentDocumentUrl, normalizedEndpoint, pageTitleValue, target])

  const loadInitial = useCallback(async () => {
    setStatus('loading')
    setError('')

    const explicitPath = explicitPageCommentsPath(target)
    const loaded = explicitPath
      ? {
          website: null,
          page: null,
          comments: await listExplicitComments(normalizedEndpoint, explicitPath)
        }
      : await listCurrentComments(normalizedEndpoint, pageTitleValue, currentDocumentUrl).then(payload => ({
          website: payload.website,
          page: payload.page,
          comments: payload.comments
        }))

    setWebsite(loaded.website)
    setPage(loaded.page)
    setComments(loaded.comments.data)
    setReplyBuckets({})
    setNextCursor(loaded.comments.pagination.next_cursor)
    setHasMore(loaded.comments.pagination.has_more)
    setStatus('ready')
    loaded.comments.data.forEach(comment => {
      void loadRepliesForComment(comment.id)
    })
  }, [currentDocumentUrl, loadRepliesForComment, normalizedEndpoint, pageTitleValue, target])

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
    if (!isHydrated || typeof window === 'undefined') return undefined
    if (window.location.hash !== `#${COMMENT_SECTION_ID}`) return undefined

    const frame = window.requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [isHydrated, session])

  useEffect(() => {
    if (!session || !resolvedWebsiteKey) {
      setCanModerate(false)
      return undefined
    }

    let cancelled = false
    ;(async () => {
      try {
        const freshSession = await ensureFreshSession(session)
        if (!freshSession) {
          if (!cancelled) setCanModerate(false)
          return
        }
        const allowed = await canModerateWebsite(normalizedEndpoint, resolvedWebsiteKey, freshSession)
        if (!cancelled) setCanModerate(allowed)
      } catch {
        if (!cancelled) setCanModerate(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [ensureFreshSession, normalizedEndpoint, resolvedWebsiteKey, session])

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
    if (visibleComments.length === 0) {
      setRenderedHtml({})
      return undefined
    }
    let cancelled = false
    ;(async () => {
      const next: Record<number, string> = {}
      await Promise.all(visibleComments.map(async comment => {
        next[comment.id] = await renderMarkdown(comment.body)
      }))
      if (!cancelled) setRenderedHtml(next)
    })()
    return () => {
      cancelled = true
    }
  }, [visibleComments])

  const handleLoadMore = async () => {
    if (!hasMore || busy) return
    setBusy(true)
    setError('')
    try {
      const explicitPath = explicitPageCommentsPath(target)
      const loaded = explicitPath
        ? await listExplicitComments(normalizedEndpoint, explicitPath, nextCursor)
        : (await listCurrentComments(normalizedEndpoint, pageTitleValue, currentDocumentUrl, nextCursor)).comments
      setComments(current => [...current, ...loaded.data])
      setNextCursor(loaded.pagination.next_cursor)
      setHasMore(loaded.pagination.has_more)
      loaded.data.forEach(comment => {
        void loadRepliesForComment(comment.id)
      })
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
    const parentId = replyingTo
    try {
      const freshSession = await ensureFreshSession(session)
      if (!freshSession) {
        setError(copy.authError)
        return
      }

      const comment = await createComment(normalizedEndpoint, target, pageTitleValue, body, freshSession, {
        parentId,
        referrerUrl: currentDocumentUrl
      })
      if (parentId == null) {
        setComments(current => [...current, comment])
      } else {
        setReplyBuckets(current => {
          const existing = current[parentId]
          return {
            ...current,
            [parentId]: {
              comments: [...(existing?.comments ?? []), comment],
              nextCursor: existing?.nextCursor ?? null,
              hasMore: existing?.hasMore ?? false,
              status: 'ready'
            }
          }
        })
        setReplyingTo(null)
      }
      setPage(current => current ? { ...current, comment_count: current.comment_count + 1 } : current)
      setDraft('')
      setStatus('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errorTitle)
    } finally {
      setBusy(false)
    }
  }

  const handleReaction = async (comment: AtriumComment, content: ReactionContent) => {
    const key = reactionKey(comment.id, content)
    if (reactionBusy[key]) return

    setReactionBusy(current => ({ ...current, [key]: true }))
    setError('')
    try {
      const freshSession = await ensureFreshSession(session)
      if (!freshSession) {
        setError(copy.authError)
        return
      }

      if (activeReactions[key]) {
        await deleteReaction(normalizedEndpoint, target, comment.id, content, freshSession, currentDocumentUrl)
        setActiveReactions(current => ({ ...current, [key]: false }))
        updateCommentEverywhere(comment.id, current => ({
          ...current,
          reactions: adjustReactionCounts(current.reactions, content, -1)
        }))
      } else {
        const reactions = await setReaction(normalizedEndpoint, target, comment.id, content, freshSession, currentDocumentUrl)
        setActiveReactions(current => ({ ...current, [key]: true }))
        updateCommentEverywhere(comment.id, current => ({ ...current, reactions }))
      }
      setReactionPickerFor(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errorTitle)
    } finally {
      setReactionBusy(current => ({ ...current, [key]: false }))
    }
  }

  const handleDeleteComment = async (comment: AtriumComment) => {
    const key = `delete:${comment.id}`
    if (!resolvedWebsiteKey || commentActionBusy[key]) return
    if (typeof window !== 'undefined' && !window.confirm(copy.confirmDelete(comment.author.login))) return

    setCommentActionBusy(current => ({ ...current, [key]: true }))
    setError('')
    try {
      const freshSession = await ensureFreshSession(session)
      if (!freshSession) {
        setError(copy.authError)
        return
      }

      await deleteComment(normalizedEndpoint, resolvedWebsiteKey, comment.id, freshSession)
      removeCommentEverywhere(comment.id)
      setReplyingTo(current => current === comment.id ? null : current)
      setPage(current => current ? { ...current, comment_count: Math.max(0, current.comment_count - 1) } : current)
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errorTitle)
    } finally {
      setCommentActionBusy(current => ({ ...current, [key]: false }))
    }
  }

  const handleBanUser = async (comment: AtriumComment) => {
    const key = `ban:${comment.author.id}`
    if (!resolvedWebsiteKey || !canModerate || commentActionBusy[key]) return
    if (typeof window !== 'undefined' && !window.confirm(copy.confirmBan(comment.author.login))) return

    setCommentActionBusy(current => ({ ...current, [key]: true }))
    setError('')
    try {
      const freshSession = await ensureFreshSession(session)
      if (!freshSession) {
        setError(copy.authError)
        return
      }

      await banWebsiteUser(normalizedEndpoint, resolvedWebsiteKey, comment.author.id, freshSession)
      setBannedAuthors(current => ({ ...current, [comment.author.id]: true }))
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errorTitle)
    } finally {
      setCommentActionBusy(current => ({ ...current, [key]: false }))
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
  const totalCount = page?.comment_count ?? visibleComments.length
  const replyTarget = visibleComments.find(comment => comment.id === replyingTo) ?? null
  const isReplying = replyingTo !== null
  const focusComposerForReply = (commentId: number) => {
    setReactionPickerFor(null)
    if (replyingTo === commentId) {
      setReplyingTo(null)
      return
    }
    setReplyingTo(commentId)
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        composerRef.current?.scrollIntoView({ block: 'center' })
        composerRef.current?.focus()
      })
    }
  }
  const renderReactionPicker = (comment: AtriumComment) => {
    if (reactionPickerFor !== comment.id) return null

    return (
      <div className="absolute left-0 top-full z-10 mt-2 flex items-center gap-1 rounded-md border border-stone-200 bg-white p-1 shadow-sm dark:border-stone-800 dark:bg-stone-950">
        {reactionOptions.map(option => {
          const key = reactionKey(comment.id, option.content)
          const active = activeReactions[key] === true
          return (
            <button
              key={option.content}
              type="button"
              disabled={!session || reactionBusy[key]}
              aria-label={option.label}
              aria-pressed={active}
              title={option.label}
              onClick={() => void handleReaction(comment, option.content)}
              className={cx(
                'flex h-8 w-8 items-center justify-center rounded-md text-base leading-none transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40',
                active
                  ? 'bg-stone-200 text-stone-950 dark:bg-stone-800 dark:text-stone-100'
                  : 'hover:bg-stone-100 dark:hover:bg-stone-900'
              )}
            >
              <span aria-hidden="true">{option.icon}</span>
            </button>
          )
        })}
      </div>
    )
  }

  const renderActions = (comment: AtriumComment, allowReply: boolean) => {
    const deleteKey = `delete:${comment.id}`
    const banKey = `ban:${comment.author.id}`
    const canDeleteComment = !!session && !!resolvedWebsiteKey && (session.user.id === comment.author.id || canModerate)
    const canBanAuthor = !!session && !!resolvedWebsiteKey && canModerate && session.user.id !== comment.author.id
    const authorBanned = bannedAuthors[comment.author.id] === true

    return (
      <div className="relative mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-400 dark:text-stone-600">
        {reactionOptions.map(option => {
          const key = reactionKey(comment.id, option.content)
          const active = activeReactions[key] === true
          const count = comment.reactions[option.content]
          const visibleCount = active ? Math.max(1, count) : count
          if (visibleCount <= 0) return null

          return (
            <button
              key={option.content}
              type="button"
              disabled={!session || reactionBusy[key]}
              aria-label={`${option.label} ${visibleCount}`}
              aria-pressed={active}
              title={option.label}
              onClick={() => void handleReaction(comment, option.content)}
              className={cx(
                'inline-flex h-7 items-center gap-1 rounded-full border px-2 text-sm leading-none transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40',
                active
                  ? 'border-stone-400 bg-stone-200/70 text-stone-950 dark:border-stone-600 dark:bg-stone-800/80 dark:text-stone-100'
                  : 'border-stone-200 bg-white/55 text-stone-700 hover:border-stone-300 hover:bg-white dark:border-stone-800 dark:bg-stone-950/30 dark:text-stone-300 dark:hover:border-stone-700 dark:hover:bg-stone-950/70'
              )}
            >
              <span aria-hidden="true">{option.icon}</span>
              <span>{visibleCount}</span>
            </button>
          )
        })}
        <button
          type="button"
          disabled={!session}
          aria-label="添加表情"
          aria-expanded={reactionPickerFor === comment.id}
          title="添加表情"
          onClick={() => setReactionPickerFor(current => current === comment.id ? null : comment.id)}
          className={cx(
            'inline-flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 bg-white/55 text-sm leading-none text-stone-500 transition-colors duration-150 hover:border-stone-300 hover:bg-white hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-800 dark:bg-stone-950/30 dark:text-stone-500 dark:hover:border-stone-700 dark:hover:bg-stone-950/70 dark:hover:text-stone-200',
            reactionPickerFor === comment.id && 'border-stone-400 text-stone-900 dark:border-stone-600 dark:text-stone-100'
          )}
        >
          <span aria-hidden="true" className="relative inline-flex h-4 w-4 items-center justify-center">
            <span className="text-[15px]">☺</span>
            <span className="absolute -right-1 -top-1 text-[10px] font-semibold leading-none">+</span>
          </span>
        </button>
        {renderReactionPicker(comment)}
        {allowReply && (
          <button
            type="button"
            disabled={!session}
            onClick={() => focusComposerForReply(comment.id)}
            className={cx(
              'ml-1 transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40',
              replyingTo === comment.id
                ? 'font-medium text-stone-800 dark:text-stone-200'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-500 dark:hover:text-stone-200'
            )}
          >
            {replyingTo === comment.id ? copy.cancelReply : copy.reply}
          </button>
        )}
        {canDeleteComment && (
          <button
            type="button"
            disabled={commentActionBusy[deleteKey]}
            onClick={() => void handleDeleteComment(comment)}
            className="ml-1 text-stone-500 transition-colors duration-150 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-stone-500 dark:hover:text-red-400"
          >
            {copy.deleteComment}
          </button>
        )}
        {canBanAuthor && (
          <button
            type="button"
            disabled={authorBanned || commentActionBusy[banKey]}
            onClick={() => void handleBanUser(comment)}
            className="text-stone-500 transition-colors duration-150 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-stone-500 dark:hover:text-red-400"
          >
            {authorBanned ? copy.bannedUser : copy.banUser}
          </button>
        )}
      </div>
    )
  }

  const renderReplies = (comment: AtriumComment) => {
    const bucket = replyBuckets[comment.id]
    if (!bucket || (bucket.status === 'ready' && bucket.comments.length === 0 && !bucket.hasMore)) {
      return null
    }

    return (
      <div className="mt-4 border-l-2 border-stone-200 pl-5 dark:border-stone-800">
        {bucket.status === 'loading' && bucket.comments.length === 0 && (
          <p className="py-2 text-xs text-stone-400 dark:text-stone-600">
            {copy.loadingReplies}
          </p>
        )}
        {bucket.comments.length > 0 && (
          <div className="divide-y divide-stone-200/60 dark:divide-stone-800/70">
            {bucket.comments.map(reply => renderCommentArticle(reply, false))}
          </div>
        )}
        {bucket.status === 'error' && (
          <button
            type="button"
            onClick={() => void loadRepliesForComment(comment.id, bucket.nextCursor)}
            className="mt-2 text-xs font-medium text-stone-500 transition-colors hover:text-stone-900 dark:text-stone-500 dark:hover:text-stone-200"
          >
            {bucket.error || copy.retry}
          </button>
        )}
        {bucket.hasMore && (
          <button
            type="button"
            onClick={() => void loadRepliesForComment(comment.id, bucket.nextCursor)}
            className="mt-3 text-xs font-medium text-stone-500 transition-colors hover:text-stone-900 dark:text-stone-500 dark:hover:text-stone-200"
          >
            {copy.loadMoreReplies}
          </button>
        )}
      </div>
    )
  }

  const renderCommentArticle = (comment: AtriumComment, allowReply: boolean) => (
    <article key={comment.id} className={allowReply ? 'px-5 py-5' : 'py-4'}>
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
      {renderActions(comment, allowReply)}
      {allowReply && renderReplies(comment)}
    </article>
  )

  return (
    <section
      ref={sectionRef}
      id={COMMENT_SECTION_ID}
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
              ) : comments.map(comment => renderCommentArticle(comment, true))}
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
              {isReplying && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-950/45 dark:text-stone-400">
                  <span className="min-w-0 truncate">
                    正在回复 {replyTarget ? `@${replyTarget.author.login}` : `#${replyingTo}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="shrink-0 text-xs font-medium text-stone-500 transition-colors hover:text-stone-950 dark:text-stone-500 dark:hover:text-stone-100"
                  >
                    {copy.cancelReply}
                  </button>
                </div>
              )}
              <label htmlFor="comment-draft" className="sr-only">
                {isReplying ? copy.replyPlaceholder : copy.textareaPlaceholder}
              </label>
              <textarea
                ref={composerRef}
                id="comment-draft"
                value={draft}
                disabled={!session || busy}
                onChange={event => setDraft(event.currentTarget.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder={session ? (isReplying ? copy.replyPlaceholder : copy.textareaPlaceholder) : copy.textareaDisabledPlaceholder}
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
                  {busy ? copy.submitting : isReplying ? copy.submitReply : copy.submit}
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
