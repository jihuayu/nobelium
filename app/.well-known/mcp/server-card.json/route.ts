import { NextResponse } from 'next/server'
import pkg from '@/package.json'
import { config } from '@/lib/server/config'
import { buildSiteAbsoluteUrl, buildSiteOrigin, buildSiteRelativePath } from '@/lib/server/sitemap'

export const dynamic = 'force-static'

const SERVER_CARD_SCHEMA = 'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json'
const SUPPORTED_PROTOCOL_VERSIONS = ['2025-03-26', '2025-06-18']

function absolute(path: string): string {
  return buildSiteAbsoluteUrl(
    buildSiteOrigin(config.link || ''),
    buildSiteRelativePath(config.path || '', path)
  )
}

function discoveryHeaders() {
  return {
    'Cache-Control': 'public, max-age=3600',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept'
  }
}

function buildServerCard() {
  const origin = buildSiteOrigin(config.link || '')
  const version = pkg.version || '1.0.0'
  const tools = [
    {
      name: 'search_blog_posts',
      description: 'Search published blog posts by query, optional tag, and result limit.',
      inputSchema: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Search query.' },
          tag: { type: 'string', description: 'Optional tag filter.' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 }
        },
        required: ['q'],
        additionalProperties: false
      }
    },
    {
      name: 'list_blog_tags',
      description: 'List public blog tags and post counts.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    },
    {
      name: 'get_homepage_markdown',
      description: 'Fetch an agent-readable Markdown representation of the homepage.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    }
  ]

  return {
    $schema: SERVER_CARD_SCHEMA,
    name: 'com.jihuayu.blog/blog-discovery',
    version,
    title: `${config.title} Agent Discovery`,
    description: 'Public, read-only discovery metadata and browser WebMCP tools for searching and reading the blog.',
    websiteUrl: origin,
    serverInfo: {
      name: 'blog-agent-discovery',
      version
    },
    transport: {
      type: 'webmcp',
      endpoint: absolute('/'),
      description: 'WebMCP browser tools are registered on page load when navigator.modelContext is available.'
    },
    remotes: [
      {
        type: 'webmcp',
        url: absolute('/'),
        supportedProtocolVersions: SUPPORTED_PROTOCOL_VERSIONS
      }
    ],
    capabilities: {
      tools,
      resources: [
        { uri: absolute('/.well-known/api-catalog'), mimeType: 'application/linkset+json' },
        { uri: absolute('/.well-known/openapi.json'), mimeType: 'application/openapi+json' },
        { uri: absolute('/.well-known/agent-skills/index.json'), mimeType: 'application/json' },
        { uri: absolute('/feed'), mimeType: 'application/rss+xml' }
      ],
      prompts: []
    },
    _meta: {
      preferredDiscoveryEndpoints: [
        absolute('/.well-known/mcp/server-card.json'),
        absolute('/.well-known/mcp-server-card')
      ],
      openapi: absolute('/.well-known/openapi.json'),
      agentSkills: absolute('/.well-known/agent-skills/index.json')
    }
  }
}

export function GET() {
  return NextResponse.json(buildServerCard(), {
    headers: discoveryHeaders()
  })
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: discoveryHeaders()
  })
}
