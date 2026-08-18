import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildPolicyManifest,
  buildLocalePath,
  canAccessArticle,
  canShowComments,
  groupPostsBySlug,
  lookupManifestArticle,
  lookupManifestRoute,
  mergeArticlePolicies,
  resolveLocale,
  resolveRegionPolicy
} from '../src/index'

test('resolveRegionPolicy maps CN to mainland', () => {
  assert.equal(resolveRegionPolicy('CN'), 'mainland')
  assert.equal(resolveRegionPolicy('cn'), 'mainland')
  assert.equal(resolveRegionPolicy('US'), 'global')
  assert.equal(resolveRegionPolicy(), 'global')
})

test('resolveLocale prefers URL prefix; cookie only negotiates homepage', () => {
  assert.deepEqual(resolveLocale({ pathname: '/en/foo' }), {
    locale: 'en',
    explicit: true,
    restPath: '/foo'
  })
  assert.deepEqual(resolveLocale({
    pathname: '/foo',
    cookie: 'somnium-locale=en'
  }), {
    locale: 'zh-CN',
    explicit: false,
    restPath: '/foo'
  })
  assert.deepEqual(resolveLocale({
    pathname: '/',
    cookie: 'somnium-locale=en'
  }), {
    locale: 'en',
    explicit: true,
    restPath: '/'
  })
  assert.deepEqual(resolveLocale({
    pathname: '/',
    acceptLanguage: 'en-US,en;q=0.9'
  }), {
    locale: 'en',
    explicit: false,
    restPath: '/'
  })
})

test('groupPostsBySlug merges policies and locales', () => {
  const groups = groupPostsBySlug([
    {
      slug: 'hello',
      pageId: 'a',
      title: '你好',
      summary: '',
      tags: [],
      date: 1,
      fullWidth: false,
      formats: [],
      visibility: 'blocked-mainland'
    },
    {
      slug: 'hello',
      pageId: 'b',
      title: 'Hello',
      summary: '',
      tags: [],
      date: 1,
      fullWidth: false,
      formats: [],
      lang: 'en',
      comments: 'disabled-mainland'
    }
  ])

  assert.equal(groups.length, 1)
  assert.equal(groups[0].policy.visibility, 'blocked-mainland')
  assert.equal(groups[0].policy.comments, 'disabled-mainland')
  assert.equal(groups[0].translations['zh-CN']?.title, '你好')
  assert.equal(groups[0].translations.en?.title, 'Hello')
})

test('buildPolicyManifest and access rules', () => {
  const groups = groupPostsBySlug([
    {
      slug: 'secret',
      pageId: 'a',
      title: 'Secret',
      summary: '',
      tags: [],
      date: 1,
      fullWidth: false,
      formats: [],
      visibility: 'blocked-mainland'
    }
  ])
  const manifest = buildPolicyManifest(groups)
  const route = lookupManifestRoute(manifest, '/secret')
  const article = lookupManifestArticle(manifest, 'secret')

  assert.ok(route)
  assert.ok(article)
  assert.equal(canAccessArticle(article!, 'global'), true)
  assert.equal(canAccessArticle(article!, 'mainland'), false)
  assert.equal(canShowComments(mergeArticlePolicies([{ visibility: 'public', comments: 'disabled-mainland' }]), 'mainland'), false)
})

test('buildLocalePath keeps zh-CN URLs stable and prefixes en', () => {
  assert.equal(buildLocalePath('/about', 'zh-CN'), '/about')
  assert.equal(buildLocalePath('/about', 'en'), '/en/about')
  assert.equal(buildLocalePath('/en/about', 'zh-CN'), '/about')
})
