import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldBypassPolicyRouter } from './policy-router'

test('policy router bypasses assets and keeps content routes', () => {
  assert.equal(shouldBypassPolicyRouter('/_astro/index.css'), true)
  assert.equal(shouldBypassPolicyRouter('/scripts/toc.js'), true)
  assert.equal(shouldBypassPolicyRouter('/robots.txt'), true)
  assert.equal(shouldBypassPolicyRouter('/api/health'), true)
  assert.equal(shouldBypassPolicyRouter('/search-index.json'), false)
  assert.equal(shouldBypassPolicyRouter('/feed.xml'), false)
  assert.equal(shouldBypassPolicyRouter('/mise-good-good'), false)
})
