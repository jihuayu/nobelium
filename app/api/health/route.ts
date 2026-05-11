import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

export function GET() {
  return NextResponse.json({ status: 'ok', service: 'blog-public-api' }, {
    headers: { 'Cache-Control': 'public, max-age=60' }
  })
}