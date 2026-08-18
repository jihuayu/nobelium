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

test('renderNotionArticleHtml attaches hover preview data for linked text', () => {
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
  assert.match(html, /data-url-mention="true"/)
  assert.match(html, /Example site/)
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
