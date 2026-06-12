import { NextRequest, NextResponse } from 'next/server'
import { shouldHideCommentsForRequest } from '@/lib/server/requestGeo'

export const dynamic = 'force-dynamic'

export function GET(req: NextRequest) {
  return NextResponse.json(
    {
      hideComments: shouldHideCommentsForRequest(req.headers)
    },
    {
      headers: {
        'Cache-Control': 'private, no-store'
      }
    }
  )
}
