import type { APIRoute } from 'astro'
import { authenticateAndResolveWebhook, triggerStaticRebuild } from '@/lib/server/notionWebhook'

export const prerender = false

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  })
}

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text()
  const handled = await authenticateAndResolveWebhook(rawBody, request.headers.get('x-notion-signature'))
  if (handled.kind === 'http') {
    return jsonResponse(handled.body, handled.status)
  }

  const { result, payloadSummary } = handled.plan
  const deploy = await triggerStaticRebuild({
    ...payloadSummary,
    action: result.action,
    reason: result.reason,
    resolvedPagePath: result.resolvedPagePath
  })

  return jsonResponse({
    ok: true,
    revalidated: false,
    rebuilt: deploy.triggered,
    deploy,
    reason: result.reason,
    eventType: result.eventType,
    entityId: result.entityId,
    action: result.action,
    timestamp: new Date().toISOString()
  })
}
