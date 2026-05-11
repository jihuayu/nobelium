import { NextResponse } from 'next/server'
import { AGENT_SKILL_MARKDOWN } from '@/lib/agent-discovery'

export const dynamic = 'force-static'

function discoveryHeaders() {
  return {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept'
  }
}

export function GET() {
  return new NextResponse(AGENT_SKILL_MARKDOWN, {
    headers: discoveryHeaders()
  })
}
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: discoveryHeaders()
  })
}
