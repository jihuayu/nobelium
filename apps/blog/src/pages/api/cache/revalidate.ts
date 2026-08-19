import type { APIRoute } from 'astro'
import { safeCompareStrings } from '@/lib/server/safeCompare'
import {
  DEFAULT_CACHE_REVALIDATE_PATHS,
  DEFAULT_CACHE_REVALIDATE_TAGS
} from '@/lib/server/cache'
import { deploymentOrigin, getIsrBypassToken, revalidateInternalPaths } from '@blog/lib/isr-cache'

export const prerender = false

interface RevalidateBody {
  token?: unknown
  tags?: unknown
  paths?: unknown
}

function jsonNoStore(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  })
}

function normalizeToken(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function parseAuthorizationToken(value: string | null): string {
  if (!value) return ''
  const trimmed = value.trim()
  const bearerPrefix = /^bearer\s+/i
  if (!bearerPrefix.test(trimmed)) return trimmed
  return trimmed.replace(bearerPrefix, '').trim()
}

function parseListValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(item => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
  }

  if (typeof value !== 'string') return []
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

function parseQueryList(searchParams: URLSearchParams, key: 'tag' | 'tags' | 'path' | 'paths'): string[] {
  const values = searchParams.getAll(key)
  if (!values.length) return []
  const output: string[] = []
  for (const value of values) {
    for (const segment of value.split(',')) {
      const trimmed = segment.trim()
      if (trimmed) output.push(trimmed)
    }
  }
  return output
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}

function normalizePath(pathValue: string): string {
  const trimmed = pathValue.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function resolveRequestToken(request: Request, url: URL, body: RevalidateBody): string {
  const headerToken = normalizeToken(request.headers.get('x-cache-revalidate-token'))
    || normalizeToken(request.headers.get('x-revalidate-token'))
    || parseAuthorizationToken(request.headers.get('authorization'))
  if (headerToken) return headerToken

  const queryToken = normalizeToken(url.searchParams.get('token'))
  if (queryToken) return queryToken

  return normalizeToken(body.token)
}

function resolveTargets(url: URL, body: RevalidateBody): { tags: string[], paths: string[] } {
  const bodyTags = parseListValue(body.tags)
  const bodyPaths = parseListValue(body.paths).map(normalizePath).filter(Boolean)
  const queryTags = [
    ...parseQueryList(url.searchParams, 'tag'),
    ...parseQueryList(url.searchParams, 'tags')
  ]
  const queryPaths = [
    ...parseQueryList(url.searchParams, 'path'),
    ...parseQueryList(url.searchParams, 'paths')
  ].map(normalizePath).filter(Boolean)

  const requestedTags = unique([...queryTags, ...bodyTags])
  const requestedPaths = unique([...queryPaths, ...bodyPaths])
  const hasRequestedTags = requestedTags.length > 0
  const hasRequestedPaths = requestedPaths.length > 0

  return {
    tags: hasRequestedTags ? requestedTags : hasRequestedPaths ? [] : [...DEFAULT_CACHE_REVALIDATE_TAGS],
    paths: hasRequestedPaths ? requestedPaths : hasRequestedTags ? [] : [...DEFAULT_CACHE_REVALIDATE_PATHS]
  }
}

async function parseBody(request: Request): Promise<RevalidateBody> {
  if (request.method !== 'POST') return {}
  const text = await request.text()
  if (!text.trim()) return {}
  try {
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as RevalidateBody
  } catch {
    throw new Error('Invalid JSON body')
  }
}

async function handle({ request }: { request: Request }) {
  const serverToken = getIsrBypassToken()
  if (!serverToken) {
    return jsonNoStore({ error: 'Server is missing CACHE_REVALIDATE_TOKEN' }, 500)
  }

  const url = new URL(request.url)
  let body: RevalidateBody = {}
  try {
    body = await parseBody(request)
  } catch {
    return jsonNoStore({ error: 'Invalid JSON body' }, 400)
  }

  const token = resolveRequestToken(request, url, body)
  if (!token || !safeCompareStrings(token, serverToken)) {
    return jsonNoStore({ error: 'Unauthorized' }, 401)
  }

  const { tags, paths } = resolveTargets(url, body)
  const revalidateResults = await revalidateInternalPaths(deploymentOrigin(request), paths, serverToken)

  return jsonNoStore({
    ok: true,
    tags,
    paths,
    revalidateResults,
    timestamp: new Date().toISOString()
  })
}

export const GET: APIRoute = handle
export const POST: APIRoute = handle
