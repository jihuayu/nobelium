import { marked } from 'marked'

export const DEFAULT_ENDPOINT = 'https://atrium-production.up.railway.app/'
export const DEFAULT_LEGACY_AUTHORIZE_ENDPOINT = 'https://api.utteranc.es/authorize'
export const SESSION_STORAGE_KEY = 'somnium-comments-session'
export const OAUTH_SESSION_STORAGE_KEY = 'utterances-session'
export const COMMENT_PAGE_SIZE = 20

export interface NativeUser {
  id: number
  login: string
  avatar_url: string
  email: string
}

export interface AuthTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  user: NativeUser
}

export interface StoredSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: NativeUser
}

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

export function normalizeEndpoint(value: string): string {
  try {
    const url = new URL(value || DEFAULT_ENDPOINT)
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return DEFAULT_ENDPOINT.replace(/\/$/, '')
  }
}

export function storageKey(owner: string, repo: string): string {
  return `${SESSION_STORAGE_KEY}:${owner}/${repo}`
}

export function readStoredSession(owner: string, repo: string): StoredSession | null {
  try {
    const raw = localStorage.getItem(storageKey(owner, repo))
    if (!raw) return null
    const session = JSON.parse(raw) as StoredSession
    if (!session.accessToken || !session.refreshToken || !session.user) return null
    return session
  } catch {
    return null
  }
}

export function writeStoredSession(owner: string, repo: string, session: StoredSession): void {
  localStorage.setItem(storageKey(owner, repo), JSON.stringify(session))
}

export function clearStoredSession(owner: string, repo: string): void {
  localStorage.removeItem(storageKey(owner, repo))
}

export function buildSession(payload: AuthTokenResponse): StoredSession {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: Date.now() + Math.max(30, payload.expires_in - 30) * 1000,
    user: payload.user
  }
}

export function buildThreadBody(title: string, description: string, url: string): string {
  const parts = [`# ${title || '评论'}`]
  if (description) parts.push(description)
  if (url) parts.push(`[${url}](${url})`)
  return parts.join('\n\n')
}

export function formatDate(value: string, locale = 'zh-CN'): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export function apiUrl(
  endpoint: string,
  path: string,
  query?: Record<string, string | number | null | undefined>
): string {
  const url = new URL(path.replace(/^\/+/, ''), `${endpoint}/`)
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    url.searchParams.set(key, String(value))
  })
  return url.toString()
}

export function authHeaders(session: StoredSession | null): HeadersInit {
  return session ? { Authorization: `Bearer ${session.accessToken}` } : {}
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message = typeof (payload as { message?: unknown })?.message === 'string'
      ? (payload as { message: string }).message
      : `Request failed with status ${response.status}`
    throw new Error(message)
  }
  return payload as T
}

// --- Markdown rendering -----------------------------------------------------

marked.setOptions({ gfm: true, breaks: true })

let purifyPromise: Promise<typeof import('dompurify')['default']> | null = null

async function loadPurify(): Promise<typeof import('dompurify')['default']> {
  if (!purifyPromise) {
    purifyPromise = import('dompurify').then(module => module.default)
  }
  return purifyPromise
}

/**
 * Render a comment body (GitHub-flavoured Markdown) to a sanitized HTML string.
 * DOMPurify is loaded lazily so the bundle stays light and never touches a
 * non-browser environment during SSR.
 */
export async function renderMarkdown(body: string): Promise<string> {
  const raw = marked.parse(body, { async: false }) as string
  const DOMPurify = await loadPurify()
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
}
