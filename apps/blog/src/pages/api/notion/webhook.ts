import type { APIRoute } from 'astro'
import { infoServerEvent } from '@/lib/server/logging'
import {
  authenticateAndResolveWebhook,
  getPrewarmablePaths,
  shouldPrewarmWebhookPaths
} from '@/lib/server/notionWebhook'
import { deploymentOrigin, revalidateInternalPaths } from '@blog/lib/isr-cache'

export const prerender = false

function jsonNoStore(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  })
}

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text()
  const handled = await authenticateAndResolveWebhook(rawBody, request.headers.get('x-notion-signature'))
  if (handled.kind === 'http') {
    return jsonNoStore(handled.body, handled.status)
  }

  const { result, payloadSummary, tags, paths } = handled.plan
  const origin = deploymentOrigin(request)
  const revalidateResults = await revalidateInternalPaths(origin, paths)
  const missingBypassToken = revalidateResults.some(item => item.error === 'missing-bypass-token')
  const prewarmEnabled = shouldPrewarmWebhookPaths()
  const scheduledPrewarmPaths = prewarmEnabled ? getPrewarmablePaths(paths) : []

  infoServerEvent('notion-webhook', 'Resolved webhook revalidation targets', {
    ...payloadSummary,
    action: result.action,
    reason: result.reason,
    resolvedPagePath: result.resolvedPagePath,
    tags,
    paths,
    origin,
    revalidateResults,
    prewarmEnabled,
    scheduledPrewarmPaths
  })

  return jsonNoStore({
    ok: true,
    revalidated: !missingBypassToken,
    reason: result.reason,
    eventType: result.eventType,
    entityId: result.entityId,
    action: result.action,
    tags,
    paths,
    revalidateResults,
    scheduledPrewarmPaths,
    timestamp: new Date().toISOString()
  })
}
