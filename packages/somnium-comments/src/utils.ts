import { marked } from 'marked'

export const DEFAULT_ENDPOINT = 'https://atrium.jihuayu.com/'
export const SESSION_STORAGE_KEY = 'somnium-comments-session'
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

export function storageKey(scope: string): string {
  return `${SESSION_STORAGE_KEY}:${scope}`
}

export function readStoredSession(scope: string): StoredSession | null {
  try {
    const raw = localStorage.getItem(storageKey(scope))
    if (!raw) return null
    const session = JSON.parse(raw) as StoredSession
    if (!session.accessToken || !session.refreshToken || !session.user) return null
    return session
  } catch {
    return null
  }
}

export function writeStoredSession(scope: string, session: StoredSession): void {
  localStorage.setItem(storageKey(scope), JSON.stringify(session))
}

export function clearStoredSession(scope: string): void {
  localStorage.removeItem(storageKey(scope))
}

export function buildSession(payload: AuthTokenResponse): StoredSession {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: Date.now() + Math.max(30, payload.expires_in - 30) * 1000,
    user: payload.user
  }
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
 * Collect unique usernames from a comment body in the form @username.
 * Only matches usernames that exist in the provided set.
 */
const MENTION_RE = /(^|[\s(])@([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}[A-Za-z0-9])?)/g

/**
 * Replace @mentions with styled <a> tags for known participants.
 * Unknown @mentions are left as plain text (no false linkify).
 */
function linkifyMentions(html: string, participants: Set<string>): string {
  // We operate on the already-rendered HTML. To avoid touching @mentions
  // inside <code> blocks, we split on <code>...</code> and only process
  // the non-code segments.
  const segments = html.split(/(<code[\s\S]*?<\/code>|<pre[\s\S]*?<\/pre>)/g)
  return segments
    .map((segment, i) => {
      // Even indices are non-code, odd indices are code blocks
      if (i % 2 === 1) return segment
      return segment.replace(MENTION_RE, (_match, prefix: string, login: string) => {
        if (!participants.has(login)) return `${prefix}@${login}`
        return `${prefix}<a href="#${login}" class="mention" data-mention="${login}">@${login}</a>`
      })
    })
    .join('')
}

/**
 * Render a comment body (GitHub-flavoured Markdown) to a sanitized HTML string.
 * DOMPurify is loaded lazily so the bundle stays light and never touches a
 * non-browser environment during SSR.
 *
 * @param participants - usernames that should be linkified when mentioned with @
 */
export async function renderMarkdown(body: string, participants?: Set<string>): Promise<string> {
  const raw = marked.parse(body, { async: false }) as string
  const DOMPurify = await loadPurify()
  const sanitized = DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['data-mention']
  })
  if (!participants || participants.size === 0) return sanitized
  return linkifyMentions(sanitized, participants)
}
