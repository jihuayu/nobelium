import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { infoServerEvent, warnServerError } from '@/lib/server/logging'
import {
  authenticateAndResolveWebhook,
  getPrewarmablePaths,
  shouldPrewarmWebhookPaths,
  shouldSkipNextIsr,
  triggerStaticRebuild
} from '@/lib/server/notionWebhook'

export const dynamic = 'force-dynamic'

function isMissingStaticGenerationStoreError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('static generation store missing')
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return `${error || 'Unknown error'}`
}

function applyRevalidation(tags: string[], paths: string[]) {
  infoServerEvent('notion-webhook', 'Applying cache invalidation', { tags, paths })

  for (const tag of tags) {
    try {
      revalidateTag(tag, 'max')
    } catch (error) {
      if (!isMissingStaticGenerationStoreError(error)) throw error
      warnServerError('notion-webhook:revalidate-tag', error, { tag })
    }
  }

  for (const path of paths) {
    try {
      if (path.includes('[') || path.includes(']')) {
        revalidatePath(path, 'page')
        continue
      }
      revalidatePath(path)
    } catch (error) {
      if (!isMissingStaticGenerationStoreError(error)) throw error
      warnServerError('notion-webhook:revalidate-path', error, { path })
    }
  }
}

async function prewarmPaths(origin: string, paths: string[], context: Record<string, unknown>): Promise<void> {
  if (!paths.length) {
    infoServerEvent('notion-webhook', 'Skipped prewarm because no eligible paths were found', context)
    return
  }

  const results = await Promise.allSettled(
    paths.map(async (path) => {
      const url = new URL(path, origin)
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: { 'x-notion-webhook-prewarm': '1' }
      })
      return { path, status: response.status, ok: response.ok }
    })
  )

  infoServerEvent('notion-webhook', 'Completed prewarm requests', {
    ...context,
    prewarmResults: results.map((result, index) => (
      result.status === 'fulfilled'
        ? result.value
        : { path: paths[index], status: null, ok: false, error: getErrorMessage(result.reason) }
    ))
  })
}

function jsonNoStore(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  })
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const handled = await authenticateAndResolveWebhook(rawBody, req.headers.get('x-notion-signature'))
  if (handled.kind === 'http') {
    return jsonNoStore(handled.body, handled.status)
  }

  const { result, payloadSummary, tags, paths } = handled.plan
  const deploy = await triggerStaticRebuild({
    ...payloadSummary,
    action: result.action,
    reason: result.reason,
    resolvedPagePath: result.resolvedPagePath
  })

  const keepIsr = !shouldSkipNextIsr() || !deploy.configured
  if (keepIsr) applyRevalidation(tags, paths)

  const prewarmEnabled = keepIsr && shouldPrewarmWebhookPaths()
  const scheduledPrewarmPaths = prewarmEnabled ? getPrewarmablePaths(paths) : []

  infoServerEvent('notion-webhook', 'Resolved webhook refresh targets', {
    ...payloadSummary,
    action: result.action,
    reason: result.reason,
    resolvedPagePath: result.resolvedPagePath,
    tags: keepIsr ? tags : [],
    paths: keepIsr ? paths : [],
    deploy,
    keepIsr,
    prewarmEnabled,
    scheduledPrewarmPaths
  })

  if (prewarmEnabled) {
    void prewarmPaths(req.nextUrl.origin, scheduledPrewarmPaths, {
      ...payloadSummary,
      action: result.action,
      reason: result.reason,
      resolvedPagePath: result.resolvedPagePath
    })
  }

  return jsonNoStore({
    ok: true,
    revalidated: keepIsr,
    rebuilt: deploy.triggered,
    deploy,
    reason: result.reason,
    eventType: result.eventType,
    entityId: result.entityId,
    action: result.action,
    tags: keepIsr ? tags : [],
    paths: keepIsr ? paths : [],
    scheduledPrewarmPaths,
    timestamp: new Date().toISOString()
  })
}
