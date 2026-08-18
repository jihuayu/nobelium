import assert from 'node:assert/strict'
import test from 'node:test'
import {
  alertWebhookFailure,
  isDeployHookConfigured,
  resetDeployHookDebounceForTests,
  triggerDebouncedDeployHook
} from '../lib/server/deployHook'

const originalFetch = globalThis.fetch

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

function resetDeployEnv() {
  delete process.env.VERCEL_DEPLOY_HOOK_URL
  delete process.env.ASTRO_DEPLOY_HOOK_URL
  delete process.env.VERCEL_DEPLOY_HOOK_DEBOUNCE_MS
  delete process.env.VERCEL_TOKEN
  delete process.env.VERCEL_ACCESS_TOKEN
  delete process.env.VERCEL_PROJECT_ID
  delete process.env.VERCEL_TEAM_ID
  delete process.env.NOTION_WEBHOOK_ALERT_URL
  delete process.env.SLACK_WEBHOOK_URL
  resetDeployHookDebounceForTests()
}

test('triggerDebouncedDeployHook skips when no hook is configured', async () => {
  resetDeployEnv()
  const result = await triggerDebouncedDeployHook()
  assert.equal(isDeployHookConfigured(), false)
  assert.equal(result.configured, false)
  assert.equal(result.skipped, true)
  assert.equal(result.reason, 'not-configured')
})

test('triggerDebouncedDeployHook posts the hook and then debounces repeats', async () => {
  resetDeployEnv()
  process.env.VERCEL_DEPLOY_HOOK_URL = 'https://api.vercel.com/v1/integrations/deploy/hook-test'
  process.env.VERCEL_DEPLOY_HOOK_DEBOUNCE_MS = '60000'

  const calls: string[] = []
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = `${input}`
    calls.push(url)
    return jsonResponse(200, { job: { id: 'dep_1' } })
  }) as typeof fetch

  try {
    const first = await triggerDebouncedDeployHook({ eventType: 'page.content_updated' })
    const second = await triggerDebouncedDeployHook({ eventType: 'page.content_updated' })
    assert.equal(first.triggered, true)
    assert.equal(first.reason, 'triggered')
    assert.equal(second.skipped, true)
    assert.equal(second.reason, 'process-debounce')
    assert.equal(calls.length, 1)
  } finally {
    globalThis.fetch = originalFetch
    resetDeployEnv()
  }
})

test('triggerDebouncedDeployHook skips when Vercel already has an in-flight deployment', async () => {
  resetDeployEnv()
  process.env.VERCEL_DEPLOY_HOOK_URL = 'https://api.vercel.com/v1/integrations/deploy/hook-test'
  process.env.VERCEL_TOKEN = 'token'
  process.env.VERCEL_PROJECT_ID = 'prj_test'
  process.env.VERCEL_DEPLOY_HOOK_DEBOUNCE_MS = '60000'

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = `${input}`
    if (url.includes('/v6/deployments')) {
      return jsonResponse(200, { deployments: [{ readyState: 'BUILDING', createdAt: Date.now() }] })
    }
    throw new Error(`unexpected fetch ${url}`)
  }) as typeof fetch

  try {
    const result = await triggerDebouncedDeployHook()
    assert.equal(result.skipped, true)
    assert.equal(result.reason, 'recent-deployment')
  } finally {
    globalThis.fetch = originalFetch
    resetDeployEnv()
  }
})

test('alertWebhookFailure posts to the configured alert URL', async () => {
  resetDeployEnv()
  process.env.NOTION_WEBHOOK_ALERT_URL = 'https://example.com/alert'
  const bodies: unknown[] = []

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body || '{}')))
    return jsonResponse(200, { ok: true })
  }) as typeof fetch

  try {
    await alertWebhookFailure('Deploy Hook failed', { reason: 'hook-http-error' })
    assert.equal(bodies.length, 1)
    assert.equal((bodies[0] as { message: string }).message, 'Deploy Hook failed')
  } finally {
    globalThis.fetch = originalFetch
    resetDeployEnv()
  }
})
