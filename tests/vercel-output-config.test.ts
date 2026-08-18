import assert from 'node:assert/strict'
import test from 'node:test'
import {
  POLICY_ROUTER_MIDDLEWARE_SRC,
  attachPolicyRouterMiddleware,
  matchesPolicyRouterMiddleware
} from '../scripts/vercel-output-config.mjs'

test('policy middleware matcher covers pages and skips static/API assets', () => {
  assert.equal(matchesPolicyRouterMiddleware('/'), true)
  assert.equal(matchesPolicyRouterMiddleware('/mise-good-good'), true)
  assert.equal(matchesPolicyRouterMiddleware('/en/mise-good-good'), true)
  assert.equal(matchesPolicyRouterMiddleware('/site/global/zh-CN'), true)
  assert.equal(matchesPolicyRouterMiddleware('/search-index.json'), true)
  assert.equal(matchesPolicyRouterMiddleware('/feed.xml'), true)
  assert.equal(matchesPolicyRouterMiddleware('/_astro/index.css'), false)
  assert.equal(matchesPolicyRouterMiddleware('/api/health'), false)
  assert.equal(matchesPolicyRouterMiddleware('/scripts/toc.js'), false)
  assert.equal(matchesPolicyRouterMiddleware('/robots.txt'), false)
  assert.equal(matchesPolicyRouterMiddleware('/favicon.ico'), false)
})

test('attachPolicyRouterMiddleware runs Edge Middleware before filesystem', () => {
  const next = attachPolicyRouterMiddleware({
    version: 3,
    routes: [
      { handle: 'filesystem' },
      {
        src: '^/_astro/(.*)$',
        headers: { 'cache-control': 'public, max-age=31536000, immutable' },
        continue: true
      },
      { src: '^/api/health/?$', dest: '_middleware' }
    ]
  })

  assert.deepEqual(next.routes[0], {
    src: POLICY_ROUTER_MIDDLEWARE_SRC,
    middlewarePath: '_middleware',
    continue: true
  })
  assert.deepEqual(next.routes[1], { handle: 'filesystem' })
  assert.equal(next.routes[2].dest, '/site/mainland/zh-CN/404')
  assert.equal(next.routes[2].status, 404)
  assert.equal(next.routes[5].dest, '/site/global/en/404')
  assert.equal(next.routes.at(-1)?.dest, '_middleware')
})

test('attachPolicyRouterMiddleware is idempotent', () => {
  const first = attachPolicyRouterMiddleware({
    version: 3,
    routes: [{ handle: 'filesystem' }]
  })
  const second = attachPolicyRouterMiddleware(first)
  assert.equal(
    second.routes.filter(route => route.middlewarePath === '_middleware').length,
    1
  )
  assert.equal(
    second.routes.filter(route => route.status === 404 && typeof route.dest === 'string').length,
    4
  )
})
