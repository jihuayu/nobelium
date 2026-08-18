import assert from 'node:assert/strict'
import test from 'node:test'
import {
  INTERNAL_VARIANT_HEADER,
  INTERNAL_VARIANT_QUERY,
  POLICY_ROUTER_DEST_SRC,
  attachPolicyRouterMiddleware,
  matchesPolicyRouterDest
} from '../scripts/vercel-output-config'

test('policy dest matcher covers public pages and skips /site and assets', () => {
  assert.equal(matchesPolicyRouterDest('/'), true)
  assert.equal(matchesPolicyRouterDest('/mise-good-good'), true)
  assert.equal(matchesPolicyRouterDest('/en/mise-good-good'), true)
  assert.equal(matchesPolicyRouterDest('/search-index.json'), true)
  assert.equal(matchesPolicyRouterDest('/feed.xml'), true)
  assert.equal(matchesPolicyRouterDest('/site/global/zh-CN'), false)
  assert.equal(matchesPolicyRouterDest('/site/global/zh-CN/index.html'), false)
  assert.equal(matchesPolicyRouterDest('/_astro/index.css'), false)
  assert.equal(matchesPolicyRouterDest('/api/health'), false)
  assert.equal(matchesPolicyRouterDest('/scripts/toc.js'), false)
  assert.equal(matchesPolicyRouterDest('/robots.txt'), false)
  assert.equal(matchesPolicyRouterDest('/favicon.ico'), false)
})

test('attachPolicyRouterMiddleware serves /site via filesystem fetch and dests public pages', () => {
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
    src: '^/site(?:/.*)?$',
    missing: [
      { type: 'header', key: INTERNAL_VARIANT_HEADER },
      { type: 'query', key: INTERNAL_VARIANT_QUERY, value: '1' }
    ],
    status: 404
  })
  assert.deepEqual(next.routes[1], { handle: 'filesystem' })
  assert.equal(next.routes[2].dest, '/site/mainland/zh-CN/404')
  assert.deepEqual(next.routes[6], {
    src: POLICY_ROUTER_DEST_SRC,
    dest: '_middleware'
  })
  assert.equal(next.routes.at(-1)?.src, '^/api/health/?$')
})

test('attachPolicyRouterMiddleware is idempotent and drops the blank-page rewrite route', () => {
  const first = attachPolicyRouterMiddleware({
    version: 3,
    routes: [
      {
        src: '^/(?!_astro/).*$',
        middlewarePath: '_middleware',
        continue: true
      },
      { handle: 'filesystem' }
    ]
  })
  const second = attachPolicyRouterMiddleware(first)
  assert.equal(
    second.routes.filter(route => route.middlewarePath === '_middleware').length,
    0
  )
  assert.equal(
    second.routes.filter(route => route.dest === '_middleware' && route.src === POLICY_ROUTER_DEST_SRC).length,
    1
  )
  assert.equal(
    second.routes.filter(route => route.src === '^/site(?:/.*)?$').length,
    1
  )
})
