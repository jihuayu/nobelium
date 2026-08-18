import { infoServerEvent, warnServerError, warnServerEvent } from '@/lib/server/logging'

export interface DeployHookResult {
  configured: boolean
  triggered: boolean
  skipped: boolean
  ok: boolean
  reason: string
  status?: number
}

const DEFAULT_DEBOUNCE_MS = 60_000
const BUILDING_STATES = new Set(['BUILDING', 'QUEUED', 'INITIALIZING', 'PENDING'])

let lastProcessTriggerAt = 0

function readEnv(name: string): string {
  return `${process.env[name] || ''}`.trim()
}

export function getDeployHookUrl(): string {
  return readEnv('VERCEL_DEPLOY_HOOK_URL') || readEnv('ASTRO_DEPLOY_HOOK_URL')
}

export function isDeployHookConfigured(): boolean {
  return Boolean(getDeployHookUrl())
}

export function getDeployHookDebounceMs(): number {
  const parsed = Number.parseInt(readEnv('VERCEL_DEPLOY_HOOK_DEBOUNCE_MS') || `${DEFAULT_DEBOUNCE_MS}`, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_DEBOUNCE_MS
}

export function getWebhookAlertUrl(): string {
  return readEnv('NOTION_WEBHOOK_ALERT_URL') || readEnv('SLACK_WEBHOOK_URL')
}

function vercelApiHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json'
  }
}

function vercelDeploymentsUrl(projectId: string, teamId: string): string {
  const url = new URL('https://api.vercel.com/v6/deployments')
  url.searchParams.set('projectId', projectId)
  url.searchParams.set('limit', '8')
  if (teamId) url.searchParams.set('teamId', teamId)
  return url.toString()
}

async function hasRecentOrInFlightDeployment(debounceMs: number, now = Date.now()): Promise<boolean> {
  const token = readEnv('VERCEL_TOKEN') || readEnv('VERCEL_ACCESS_TOKEN')
  const projectId = readEnv('VERCEL_PROJECT_ID')
  if (!token || !projectId) return false

  const teamId = readEnv('VERCEL_TEAM_ID') || readEnv('VERCEL_ORG_ID')
  const response = await fetch(vercelDeploymentsUrl(projectId, teamId), {
    headers: vercelApiHeaders(token),
    cache: 'no-store'
  })
  if (!response.ok) {
    warnServerEvent('deploy-hook', 'Failed to list Vercel deployments for debounce', {
      status: response.status
    })
    return false
  }

  const payload = await response.json() as {
    deployments?: Array<{ created?: number, createdAt?: number, readyState?: string, state?: string }>
  }
  const deployments = Array.isArray(payload.deployments) ? payload.deployments : []
  return deployments.some(item => {
    const createdAt = Number(item.createdAt || item.created || 0)
    const state = `${item.readyState || item.state || ''}`.toUpperCase()
    if (BUILDING_STATES.has(state)) return true
    return createdAt > 0 && now - createdAt < debounceMs
  })
}

export async function triggerDebouncedDeployHook(context: Record<string, unknown> = {}): Promise<DeployHookResult> {
  const hookUrl = getDeployHookUrl()
  if (!hookUrl) {
    return { configured: false, triggered: false, skipped: true, ok: true, reason: 'not-configured' }
  }

  const debounceMs = getDeployHookDebounceMs()
  const now = Date.now()
  if (debounceMs > 0 && now - lastProcessTriggerAt < debounceMs) {
    infoServerEvent('deploy-hook', 'Skipped deploy hook due to in-process debounce', {
      ...context,
      debounceMs
    })
    return { configured: true, triggered: false, skipped: true, ok: true, reason: 'process-debounce' }
  }

  try {
    if (await hasRecentOrInFlightDeployment(debounceMs, now)) {
      infoServerEvent('deploy-hook', 'Skipped deploy hook because a recent or in-flight deployment exists', {
        ...context,
        debounceMs
      })
      return { configured: true, triggered: false, skipped: true, ok: true, reason: 'recent-deployment' }
    }
  } catch (error) {
    warnServerError('deploy-hook:list-deployments', error, context)
  }

  try {
    const response = await fetch(hookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'notion-webhook', ...context })
    })
    const ok = response.ok
    if (ok) lastProcessTriggerAt = Date.now()
    const result: DeployHookResult = {
      configured: true,
      triggered: ok,
      skipped: false,
      ok,
      reason: ok ? 'triggered' : 'hook-http-error',
      status: response.status
    }
    if (ok) {
      infoServerEvent('deploy-hook', 'Triggered Vercel Deploy Hook', { ...context, status: response.status })
    } else {
      warnServerEvent('deploy-hook', 'Deploy Hook returned a non-OK status', {
        ...context,
        status: response.status
      })
    }
    return result
  } catch (error) {
    warnServerError('deploy-hook:trigger', error, context)
    return {
      configured: true,
      triggered: false,
      skipped: false,
      ok: false,
      reason: 'hook-network-error'
    }
  }
}

export function resetDeployHookDebounceForTests() {
  lastProcessTriggerAt = 0
}

export async function alertWebhookFailure(
  message: string,
  context: Record<string, unknown> = {}
): Promise<void> {
  const alertUrl = getWebhookAlertUrl()
  warnServerEvent('notion-webhook', message, context)
  if (!alertUrl) return

  try {
    const response = await fetch(alertUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `[somnium webhook] ${message}`,
        message,
        context
      })
    })
    if (!response.ok) {
      warnServerEvent('notion-webhook', 'Failure alert endpoint returned a non-OK status', {
        status: response.status
      })
    }
  } catch (error) {
    warnServerError('notion-webhook:alert', error, { message })
  }
}
