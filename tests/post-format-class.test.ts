import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getPostFormatClassNames } from '../lib/postFormat'

test('post format classes include code-heavy article marker', () => {
  const html = renderToStaticMarkup(
    React.createElement('article', {
      className: getPostFormatClassNames({ formats: ['codeHeavy'] }).join(' ')
    })
  )

  assert.match(html, /notion-post-format-code-heavy/)
})

test('post format classes support combined wide and code-heavy markers', () => {
  assert.deepEqual(
    getPostFormatClassNames({ formats: ['wide', 'codeHeavy'] }),
    ['notion-post-format-wide', 'notion-post-format-code-heavy']
  )
})
