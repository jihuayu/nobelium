import { NextResponse } from 'next/server'
import { notFound } from 'next/navigation'
import { AGENT_DISCOVERY_LINK_HEADER, estimateMarkdownTokens } from '@/lib/agent-discovery'
import { markdownForAgentPath } from '@/lib/server/markdownForAgents'

export const revalidate = 300

type RouteParams = Promise<{ path?: string[] }>

export async function GET(_request: Request, { params }: { params: RouteParams }) {
  const { path = [] } = await params
  const markdown = await markdownForAgentPath(path)

  if (!markdown) notFound()

  return new NextResponse(`${markdown.trim()}\n`, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=300',
      'Link': AGENT_DISCOVERY_LINK_HEADER,
      'Vary': 'Accept',
      'x-markdown-tokens': `${estimateMarkdownTokens(markdown)}`
    }
  })
}
