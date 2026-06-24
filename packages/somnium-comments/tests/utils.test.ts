import test from 'node:test'
import assert from 'node:assert/strict'
import {
  apiUrl,
  buildSession,
  buildThreadBody,
  cx,
  formatDate,
  normalizeEndpoint,
  storageKey,
  type AuthTokenResponse
} from '../src/utils'

test('cx joins truthy values and skips falsy ones', () => {
  assert.equal(cx('a', false, null, undefined, 'b'), 'a b')
  assert.equal(cx(), '')
  assert.equal(cx(false, null), '')
})

test('normalizeEndpoint strips trailing slash, search and hash', () => {
  assert.equal(normalizeEndpoint('https://api.example.com/'), 'https://api.example.com')
  assert.equal(normalizeEndpoint('https://api.example.com/foo/?x=1#h'), 'https://api.example.com/foo')
})

test('normalizeEndpoint falls back to default for invalid input', () => {
  assert.equal(normalizeEndpoint('not-a-url'), normalizeEndpoint(''))
  assert.match(normalizeEndpoint(''), /^https:\/\//)
})

test('storageKey is namespaced by owner/repo', () => {
  assert.equal(storageKey('jihuayu', 'blog'), 'somnium-comments-session:jihuayu/blog')
})

test('buildSession subtracts a 30s skew margin and floors at 30s', () => {
  const now = Date.now()
  const longLived: AuthTokenResponse = {
    access_token: 'a',
    refresh_token: 'r',
    expires_in: 3600,
    token_type: 'Bearer',
    user: { id: 1, login: 'u', avatar_url: '', email: '' }
  }
  const session = buildSession(longLived)
  assert.ok(session.expiresAt > now + 3500 * 1000)
  assert.ok(session.expiresAt < now + 3600 * 1000)

  const tiny: AuthTokenResponse = { ...longLived, expires_in: 10 }
  const tinySession = buildSession(tiny)
  // Math.max(30, 10 - 30) === 30, so at least 30s lifetime.
  assert.ok(tinySession.expiresAt >= now + 29 * 1000)
})

test('buildThreadBody always starts with a heading and joins non-empty parts', () => {
  assert.equal(buildThreadBody('Title', '', ''), '# Title')
  assert.equal(
    buildThreadBody('Title', 'Desc', 'https://x'),
    '# Title\n\nDesc\n\n[https://x](https://x)'
  )
  assert.equal(buildThreadBody('', 'Desc', 'https://x'), '# 评论\n\nDesc\n\n[https://x](https://x)')
})

test('formatDate formats valid dates and returns input for invalid ones', () => {
  const out = formatDate('2024-01-02T03:04:05Z', 'zh-CN')
  assert.match(out, /2024/)
  assert.equal(formatDate('not-a-date'), 'not-a-date')
})

test('formatDate respects locale', () => {
  const zh = formatDate('2024-01-02T03:04:05Z', 'zh-CN')
  const en = formatDate('2024-01-02T03:04:05Z', 'en-US')
  assert.notEqual(zh, en)
  assert.match(en, /2024/)
})

test('apiUrl joins path under endpoint and skips empty query values', () => {
  const url = apiUrl('https://api.example.com', '/api/v1/x', {
    a: '1',
    b: 2,
    c: null,
    d: undefined,
    e: ''
  })
  assert.equal(url, 'https://api.example.com/api/v1/x?a=1&b=2')
})

test('apiUrl strips leading slashes from path', () => {
  assert.equal(
    apiUrl('https://api.example.com', '///double'),
    'https://api.example.com/double'
  )
})
