export const AGENT_DISCOVERY_LINK_HEADER = [
  '</.well-known/api-catalog>; rel="api-catalog"',
  '</.well-known/openapi.json>; rel="service-desc"; type="application/openapi+json"',
  '</docs/api>; rel="service-doc"; type="text/markdown"',
  '</.well-known/agent-skills/index.json>; rel="describedby"; type="application/json"',
  '</.well-known/mcp/server-card.json>; rel="describedby"; type="application/json"',
  '</.well-known/oauth-protected-resource>; rel="oauth-protected-resource"; type="application/json"'
].join(', ')

export const AGENT_SKILL_MARKDOWN = `---
name: blog-discovery
description: Discover and use the public APIs, Markdown views, search, tags, feed, and WebMCP tools for the blog at https://blog.jihuayu.com.
---

# Blog Discovery Skill

Use this skill when an agent needs to discover, search, navigate, or read the public blog at https://blog.jihuayu.com.

## Capabilities

- Discover public APIs through \`/.well-known/api-catalog\`.
- Inspect the OpenAPI description at \`/.well-known/openapi.json\`.
- Inspect the MCP Server Card at \`/.well-known/mcp/server-card.json\`.
- Search public posts with \`GET /api/search?q={query}&limit={limit}\`.
- Optionally filter search by tag with \`GET /api/search?q={query}&tag={tag}&limit={limit}\`.
- List public tags and post counts with \`GET /api/tags\`.
- Read the RSS feed from \`/feed\`.
- Request HTML pages as Markdown with \`Accept: text/markdown\`.
- In browsers that implement WebMCP, use the page-registered tools \`search_blog_posts\`, \`list_blog_tags\`, and \`get_homepage_markdown\`.

## Quick Start

1. Fetch \`/.well-known/api-catalog\` to locate public API and documentation links.
2. Fetch \`/.well-known/openapi.json\` for machine-readable endpoint details.
3. Search posts with \`/api/search\` when the user provides a query.
4. Use \`Accept: text/markdown\` for cleaner agent-readable page content.

## Authentication

The public reading, search, tag, feed, documentation, discovery, and WebMCP browser tool endpoints do not require authentication.
`


export function estimateMarkdownTokens(markdown: string): number {
  return Math.max(1, Math.ceil(markdown.length / 4))
}