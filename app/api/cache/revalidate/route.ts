import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const body = {
  error: 'gone',
  message: 'Manual ISR revalidation was removed. Configure VERCEL_DEPLOY_HOOK_URL and use POST /api/notion/webhook.'
}

export function GET() {
  return NextResponse.json(body, { status: 410, headers: { 'Cache-Control': 'no-store' } })
}

export function POST() {
  return NextResponse.json(body, { status: 410, headers: { 'Cache-Control': 'no-store' } })
}
