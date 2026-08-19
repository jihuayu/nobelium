import assert from 'node:assert/strict'
import test from 'node:test'
import {
  expandPublicPathToInternalVariants,
  expandPublicPathsToInternalVariants
} from '../apps/blog/src/lib/isr-cache'

test('expandPublicPathToInternalVariants maps public URLs onto all region/locale internals', () => {
  assert.deepEqual(expandPublicPathToInternalVariants('/mise-good-good').sort(), [
    '/site/global/en/mise-good-good',
    '/site/global/zh-CN/mise-good-good',
    '/site/mainland/en/mise-good-good',
    '/site/mainland/zh-CN/mise-good-good'
  ].sort())

  assert.deepEqual(expandPublicPathToInternalVariants('/en/mise-good-good').sort(), [
    '/site/global/en/mise-good-good',
    '/site/global/zh-CN/mise-good-good',
    '/site/mainland/en/mise-good-good',
    '/site/mainland/zh-CN/mise-good-good'
  ].sort())

  assert.deepEqual(expandPublicPathToInternalVariants('/').sort(), [
    '/site/global/en',
    '/site/global/zh-CN',
    '/site/mainland/en',
    '/site/mainland/zh-CN'
  ].sort())
})

test('expandPublicPathToInternalVariants skips Next dynamic patterns and API routes', () => {
  assert.deepEqual(expandPublicPathToInternalVariants('/[slug]'), [])
  assert.deepEqual(expandPublicPathToInternalVariants('/page/[page]'), [])
  assert.deepEqual(expandPublicPathToInternalVariants('/tag/[tag]'), [])
  assert.deepEqual(expandPublicPathToInternalVariants('/api/tags'), [])
  assert.deepEqual(expandPublicPathToInternalVariants(''), [])
})

test('expandPublicPathsToInternalVariants also busts search index and feed.xml companions', () => {
  const paths = expandPublicPathsToInternalVariants(['/search', '/feed'])
  assert.equal(paths.includes('/site/global/zh-CN/search'), true)
  assert.equal(paths.includes('/site/global/zh-CN/search-index.json'), true)
  assert.equal(paths.includes('/site/mainland/en/feed'), true)
  assert.equal(paths.includes('/site/mainland/en/feed.xml'), true)
})
