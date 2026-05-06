import { ImageResponse } from '@vercel/og'
import type { ReactElement } from 'react'
import { config } from '@/lib/server/config'
import { fetchCoverDataUrl, loadOgFonts, resolvePublishedPageOgData } from '@/lib/server/notionOg'

export const runtime = 'nodejs'

const IMAGE_WIDTH = 1200
const IMAGE_HEIGHT = 630
const CACHE_CONTROL = 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400'

function normalizeText(value: string, limit: number): string {
  const trimmed = `${value || ''}`.trim()
  if (!trimmed) return ''
  if (trimmed.length <= limit) return trimmed
  return `${trimmed.slice(0, Math.max(limit - 1, 1)).trimEnd()}...`
}

function buildBaseContainer(background: string, color: string, fontFamily: string) {
  return {
    width: '100%',
    height: '100%',
    display: 'flex',
    position: 'relative' as const,
    overflow: 'hidden' as const,
    background,
    color,
    fontFamily
  }
}

function renderCoverOgImage({
  coverDataUrl,
  title,
  summary,
  fontFamily
}: {
  coverDataUrl: string
  title: string
  summary: string
  fontFamily: string
}) {
  return (
    <div style={buildBaseContainer('#09090b', '#ffffff', fontFamily)}>
      <img
        src={coverDataUrl}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.22)'
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(9, 9, 11, 0.08) 0%, rgba(9, 9, 11, 0.82) 100%)'
        }}
      />
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          width: '100%',
          height: '100%',
          padding: '72px 72px 60px'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '980px'
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 72,
              lineHeight: 1.12,
              fontWeight: 700,
              letterSpacing: '-0.04em'
            }}
          >
            {title}
          </div>
          {summary ? (
            <div
              style={{
                display: 'flex',
                marginTop: 18,
                fontSize: 30,
                lineHeight: 1.35,
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.92)'
              }}
            >
              {summary}
            </div>
          ) : null}
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 28,
            fontSize: 24,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(255, 255, 255, 0.82)'
          }}
        >
          {config.title}
        </div>
      </div>
    </div>
  )
}

function renderTitleOgImage({
  title,
  fontFamily
}: {
  title: string
  fontFamily: string
}) {
  return (
    <div style={buildBaseContainer(config.lightBackground || '#ffffff', '#18181b', fontFamily)}>
      <div
        style={{
          position: 'absolute',
          top: -160,
          right: -120,
          width: 420,
          height: 420,
          borderRadius: '999px',
          background: 'rgba(24, 24, 27, 0.05)'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -180,
          left: -80,
          width: 360,
          height: 360,
          borderRadius: '999px',
          background: 'rgba(24, 24, 27, 0.08)'
        }}
      />
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          padding: '72px'
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 148,
            height: 12,
            borderRadius: 999,
            background: '#18181b'
          }}
        />
        <div
          style={{
            display: 'flex',
            maxWidth: '980px',
            fontSize: 78,
            lineHeight: 1.08,
            fontWeight: 700,
            letterSpacing: '-0.045em'
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 24,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(24, 24, 27, 0.72)'
          }}
        >
          {config.title}
        </div>
      </div>
    </div>
  )
}

interface OgImageResponseOptions {
  title: string
  summary: string
  coverDataUrl: string
  fontFamily: string
  fonts: Awaited<ReturnType<typeof loadOgFonts>>
  createResponse?: (element: ReactElement, init: ConstructorParameters<typeof ImageResponse>[1]) => ImageResponse
  onCoverRenderError?: (error: unknown) => void
}

function buildImageResponseInit(fontFamily: string, fonts: Awaited<ReturnType<typeof loadOgFonts>>) {
  return {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    fonts: fonts.length
      ? fonts.map(font => ({ ...font, name: fontFamily }))
      : undefined,
    emoji: 'twemoji' as const,
    headers: {
      'cache-control': CACHE_CONTROL
    }
  }
}

export function createNotionOgImageResponse({
  title,
  summary,
  coverDataUrl,
  fontFamily,
  fonts,
  createResponse = (element, init) => new ImageResponse(element, init),
  onCoverRenderError
}: OgImageResponseOptions) {
  const init = buildImageResponseInit(fontFamily, fonts)

  if (coverDataUrl) {
    try {
      return createResponse(renderCoverOgImage({ coverDataUrl, title, summary, fontFamily }), init)
    } catch (error) {
      onCoverRenderError?.(error)
    }
  }

  return createResponse(renderTitleOgImage({ title, fontFamily }), init)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const pageId = `${searchParams.get('pageId') || ''}`.trim()

  if (!pageId) {
    return new Response('Missing pageId', { status: 400 })
  }

  let page = null

  page = await resolvePublishedPageOgData(pageId, {
    onPublishedLookupError: (error) => {
      console.error(`[og] Published page lookup failed for page ${pageId}, falling back to direct page lookup:`, error)
    }
  })

  if (!page) {
    return new Response('Not found', {
      status: 404,
      headers: { 'cache-control': 'no-store' }
    })
  }

  const title = normalizeText(page.title || config.title, 120) || config.title
  const summary = normalizeText(page.summary || '', 240)
  let coverDataUrl = ''

  if (page.coverUrl) {
    try {
      coverDataUrl = await fetchCoverDataUrl(page.coverUrl)
    } catch (error) {
      console.error(`[og] Failed to fetch cover for page ${pageId}:`, error)
    }
  }

  let fonts: Awaited<ReturnType<typeof loadOgFonts>> = []
  try {
    fonts = await loadOgFonts([title, summary, config.title])
  } catch (error) {
    console.error(`[og] Failed to load OG fonts for page ${pageId}:`, error)
  }

  const fontFamily = fonts.length ? 'NotionOgSans' : 'sans-serif'

  return createNotionOgImageResponse({
    title,
    summary,
    coverDataUrl,
    fontFamily,
    fonts,
    onCoverRenderError: (error) => {
      console.error(`[og] Failed to render cover image for page ${pageId}, falling back to title image:`, error)
    }
  })
}
