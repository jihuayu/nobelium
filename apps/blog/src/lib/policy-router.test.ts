import assert from 'node:assert/strict'
import test from 'node:test'
import type { PolicyManifest } from '@jihuayu/site-policy'
import {
  decidePolicyRouter,
  shouldBypassPolicyRouter
} from './policy-router'

const manifest: PolicyManifest = {
  routes: {
    '/public-post': { key: 'public-post', locale: 'zh-CN', internalPath: '/public-post' },
    '/en/public-post': { key: 'public-post', locale: 'en', internalPath: '/public-post' },
    '/secret-post': { key: 'secret-post', locale: 'zh-CN', internalPath: '/secret-post' },
    '/zh-only': { key: 'zh-only', locale: 'zh-CN', internalPath: '/zh-only' },
    '/en/zh-only': { key: 'zh-only', locale: 'en', internalPath: '/zh-only' }
  },
  articles: {
    'public-post': {
      visibility: 'public',
      comments: 'default',
      translations: { 'zh-CN': true, en: true }
    },
    'secret-post': {
      visibility: 'blocked-mainland',
      comments: 'default',
      translations: { 'zh-CN': true }
    },
    'zh-only': {
      visibility: 'public',
      comments: 'default',
      translations: { 'zh-CN': true }
    }
  }
}

test('policy router bypasses assets and keeps content routes', () => {
  assert.equal(shouldBypassPolicyRouter('/_astro/index.css'), true)
  assert.equal(shouldBypassPolicyRouter('/scripts/toc.js'), true)
  assert.equal(shouldBypassPolicyRouter('/robots.txt'), true)
  assert.equal(shouldBypassPolicyRouter('/api/health'), true)
  assert.equal(shouldBypassPolicyRouter('/search-index.json'), false)
  assert.equal(shouldBypassPolicyRouter('/feed.xml'), false)
  assert.equal(shouldBypassPolicyRouter('/mise-good-good'), false)
})

test('policy router rewrites public pages onto the matching /site variant', () => {
  const home = decidePolicyRouter({
    pathname: '/',
    country: 'US',
    acceptLanguage: 'zh-CN',
    manifest
  })
  assert.deepEqual(home, {
    type: 'rewrite',
    pathname: '/site/global/zh-CN',
    notFoundPathname: '/site/global/zh-CN/404',
    headers: {
      'x-somnium-region': 'global',
      'x-somnium-locale': 'zh-CN'
    }
  })

  const article = decidePolicyRouter({
    pathname: '/public-post',
    regionParam: 'mainland',
    manifest
  })
  assert.equal(article.type, 'rewrite')
  if (article.type === 'rewrite') {
    assert.equal(article.pathname, '/site/mainland/zh-CN/public-post')
  }
})

test('policy router redirects English homepage negotiation to /en/', () => {
  const decision = decidePolicyRouter({
    pathname: '/',
    acceptLanguage: 'en-US,en;q=0.9',
    search: '?__region=global',
    manifest
  })
  assert.deepEqual(decision, {
    type: 'redirect',
    location: '/en/?__region=global',
    status: 307
  })
})

test('policy router hides /site internals unless this is an Astro rewrite re-entry', () => {
  assert.equal(decidePolicyRouter({
    pathname: '/site/global/zh-CN',
    manifest
  }).type, 'block-direct-variant')
  assert.equal(decidePolicyRouter({
    pathname: '/site/global/zh-CN',
    allowInternalVariants: true,
    manifest
  }).type, 'allow-internal')
})

test('policy router 404s mainland-blocked articles and missing English translations', () => {
  const blocked = decidePolicyRouter({
    pathname: '/secret-post',
    regionParam: 'mainland',
    manifest
  })
  assert.equal(blocked.type, 'rewrite')
  if (blocked.type === 'rewrite') {
    assert.equal(blocked.status, 404)
    assert.equal(blocked.pathname, '/site/mainland/zh-CN/404')
  }

  const missingEn = decidePolicyRouter({
    pathname: '/en/zh-only',
    regionParam: 'global',
    manifest
  })
  assert.equal(missingEn.type, 'rewrite')
  if (missingEn.type === 'rewrite') {
    assert.equal(missingEn.status, 404)
    assert.equal(missingEn.pathname, '/site/global/en/404')
  }
})

test('policy router maps markdown Accept onto variant markdown routes', () => {
  const home = decidePolicyRouter({
    pathname: '/',
    regionParam: 'global',
    acceptLanguage: 'zh',
    accept: 'text/markdown',
    manifest
  })
  assert.equal(home.type, 'rewrite')
  if (home.type === 'rewrite') {
    assert.equal(home.pathname, '/site/global/zh-CN/markdown')
  }

  const article = decidePolicyRouter({
    pathname: '/public-post',
    regionParam: 'global',
    accept: 'text/markdown',
    manifest
  })
  assert.equal(article.type, 'rewrite')
  if (article.type === 'rewrite') {
    assert.equal(article.pathname, '/site/global/zh-CN/md/public-post')
  }
})
