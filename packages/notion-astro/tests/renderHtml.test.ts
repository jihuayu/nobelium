import assert from 'node:assert/strict'
import test from 'node:test'
import { renderNotionArticleHtml } from '../src/renderHtml'
import type { NotionRenderModel } from '@jihuayu/notion-render-core'

function model(overrides: Partial<NotionRenderModel['document']> = {}): NotionRenderModel {
  const paragraphId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  return {
    document: {
      id: 'page',
      rootIds: [paragraphId],
      blocksById: {
        [paragraphId]: {
          id: paragraphId,
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', plain_text: 'Hello world', annotations: {}, href: null, text: { content: 'Hello world', link: null } }]
          }
        }
      },
      childrenById: {},
      toc: [],
      ...overrides
    },
    toc: [],
    highlightedCodeByBlockId: {},
    linkPreviewMap: {},
    pageHrefMap: {},
    pagePreviewMap: {}
  }
}

test('renderNotionArticleHtml emits static HTML without React markers', () => {
  const html = renderNotionArticleHtml(model())
  assert.match(html, /class="notion/)
  assert.match(html, /Hello world/)
  assert.doesNotMatch(html, /data-react/)
})

test('renderNotionArticleHtml leaves ordinary external links as underlined text', () => {
  const paragraphId = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
  const html = renderNotionArticleHtml({
    ...model({
      rootIds: [paragraphId],
      blocksById: {
        [paragraphId]: {
          id: paragraphId,
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              type: 'text',
              plain_text: 'Example',
              href: 'https://example.com/page',
              annotations: {},
              text: { content: 'Example', link: { url: 'https://example.com/page' } }
            }]
          }
        }
      }
    }),
    linkPreviewMap: {
      'https://example.com/page': {
        url: 'https://example.com/page',
        title: 'Example site',
        description: 'Hello',
        image: '',
        icon: '',
        hostname: 'example.com'
      }
    }
  })
  assert.doesNotMatch(html, /data-url-mention/)
  assert.doesNotMatch(html, /notion-url-mention-wrapper/)
  assert.doesNotMatch(html, /Example site/)
  assert.match(html, /underline underline-offset-4/)
  assert.match(html, />Example</)
})

test('renderNotionArticleHtml matches Nobelium GitHub URL mention chips and hover data', () => {
  const paragraphId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
  const html = renderNotionArticleHtml({
    ...model({
      rootIds: [paragraphId],
      blocksById: {
        [paragraphId]: {
          id: paragraphId,
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              type: 'mention',
              plain_text: 'https://github.com/jdx/mise',
              href: 'https://github.com/jdx/mise',
              annotations: {},
              mention: {
                type: 'link_preview',
                link_preview: { url: 'https://github.com/jdx/mise' }
              }
            }]
          }
        }
      }
    }),
    linkPreviewMap: {
      'https://github.com/jdx/mise': {
        url: 'https://github.com/jdx/mise',
        title: 'mise-en-place',
        description: 'dev tools, env vars, task runner',
        image: 'https://opengraph.githubassets.com/preview/jdx/mise',
        icon: 'https://github.com/favicon.ico',
        hostname: 'github.com'
      }
    }
  })
  assert.match(html, /notion-url-mention-wrapper/)
  assert.match(html, /notion-url-mention notion-url-mention-link-preview/)
  assert.match(html, /notion-url-mention-icon/)
  assert.match(html, /viewBox="0 0 16 16"/)
  assert.match(html, /notion-url-mention-label">mise</)
  assert.match(html, /data-url-mention="true"/)
  assert.match(html, /mise-en-place/)
  assert.match(html, /dev tools, env vars, task runner/)
  assert.match(html, /og-proxy\.raw2\.cc/)
})

test('renderNotionArticleHtml uses the GitHub repo name for nested issue URLs', () => {
  const paragraphId = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
  const html = renderNotionArticleHtml(model({
    rootIds: [paragraphId],
    blocksById: {
      [paragraphId]: {
        id: paragraphId,
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'mention',
            plain_text: 'https://github.com/jdx/mise/issues/123',
            href: 'https://github.com/jdx/mise/issues/123',
            annotations: {},
            mention: {
              type: 'link_preview',
              link_preview: { url: 'https://github.com/jdx/mise/issues/123' }
            }
          }]
        }
      }
    }
  }))
  assert.match(html, /notion-url-mention-label">mise</)
  assert.doesNotMatch(html, /notion-url-mention-label">123</)
  assert.doesNotMatch(html, /data-url-mention/)
})

test('renderNotionArticleHtml renders link_mention chips with icon, title and hover payload', () => {
  const paragraphId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  const html = renderNotionArticleHtml(model({
    rootIds: [paragraphId],
    blocksById: {
      [paragraphId]: {
        id: paragraphId,
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'mention',
            plain_text: 'GitHub repo',
            href: 'https://github.com/jihuayu/somnium',
            annotations: {},
            mention: {
              type: 'link_mention',
              link_mention: {
                href: 'https://github.com/jihuayu/somnium',
                title: 'somnium',
                description: 'Nobelium-based blog project',
                icon_url: 'https://github.githubassets.com/favicons/favicon.svg',
                thumbnail_url: 'https://placehold.co/640x360/png?text=GitHub',
                link_provider: 'GitHub'
              }
            }
          }]
        }
      }
    }
  }))
  assert.match(html, /notion-url-mention-wrapper/)
  assert.match(html, /notion-url-mention-label">somnium</)
  assert.match(html, /<img src="https:\/\/og-proxy\.raw2\.cc\/proxy\/image\?/)
  assert.match(html, /data-url-mention="true"/)
  assert.match(html, /Nobelium-based blog project/)
  assert.match(html, /GitHub/)
})

test('renderNotionArticleHtml attaches hover preview only for internal page links with page data', () => {
  const paragraphId = 'aaaaaaaa-aaaa-aaaa-aaaa-bbbbbbbbbbbb'
  const pageId = '123456781234123412341234567890ab'
  const html = renderNotionArticleHtml({
    ...model({
      rootIds: [paragraphId],
      blocksById: {
        [paragraphId]: {
          id: paragraphId,
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              type: 'text',
              plain_text: 'Internal',
              annotations: {},
              href: `https://www.notion.so/Internal-${pageId}`,
              text: { content: 'Internal', link: { url: `https://www.notion.so/Internal-${pageId}` } }
            }]
          }
        }
      }
    }),
    pageHrefMap: { [pageId]: '/posts/internal' },
    pagePreviewMap: {
      [pageId]: {
        url: '/posts/internal',
        hostname: 'blog.jihuayu.com',
        title: 'Internal page',
        description: 'Internal page preview',
        image: '',
        icon: '/favicon.svg'
      }
    }
  })
  assert.match(html, /href="\/posts\/internal"/)
  assert.doesNotMatch(html, /target="_blank"/)
  assert.match(html, /notion-url-mention-inline/)
  assert.match(html, /data-url-mention="true"/)
  assert.match(html, /Internal page preview/)
})

test('renderNotionArticleHtml aligns bookmark cards with the React link-preview card', () => {
  const bookmarkId = 'bbbbbbbb-bbbb-bbbb-bbbb-aaaaaaaaaaaa'
  const html = renderNotionArticleHtml({
    ...model({
      rootIds: [bookmarkId],
      blocksById: {
        [bookmarkId]: {
          id: bookmarkId,
          type: 'bookmark',
          bookmark: { url: 'https://example.com/page', caption: [] }
        }
      }
    }),
    linkPreviewMap: {
      'https://example.com/page': {
        url: 'https://example.com/page',
        title: 'Example site',
        description: 'Hello from the card',
        image: 'https://example.com/cover.png',
        icon: 'https://example.com/favicon.ico',
        hostname: 'example.com'
      }
    }
  })
  assert.match(html, /data-link-preview-card="true"/)
  assert.match(html, /data-has-image="true"/)
  assert.match(html, /link-preview-cover/)
  assert.match(html, /-webkit-line-clamp:2/)
  assert.match(html, /hover:border-stone-300/)
})

test('renderNotionArticleHtml groups consecutive bullets', () => {
  const a = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  const b = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  const html = renderNotionArticleHtml(model({
    rootIds: [a, b],
    blocksById: {
      [a]: {
        id: a,
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [{ type: 'text', plain_text: 'One', annotations: {}, href: null, text: { content: 'One', link: null } }] }
      },
      [b]: {
        id: b,
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [{ type: 'text', plain_text: 'Two', annotations: {}, href: null, text: { content: 'Two', link: null } }] }
      }
    }
  }))
  assert.match(html, /<ul class="notion-list/)
  assert.match(html, /One/)
  assert.match(html, /Two/)
})
